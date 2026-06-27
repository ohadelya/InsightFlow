import { OpenAI } from "openai";
import { experts, DEFAULT_EXPERT } from "../../../src/experts/index";
import { classifyDocumentType } from "../../../src/classifier/index";
import { supportedDocumentTypes } from "../../../src/classifier/keywords";
import { assessDocumentQuality, DOCUMENT_QUALITY_THRESHOLDS } from "../../../src/classifier/documentQuality";
import { buildPrompt } from "../../../src/prompts/builder";
import { documentDashboards } from "../../../src/product/documentDashboards";
import { safeParseAIJson } from "../../../src/utils/safeJson";
import { computeHash } from "../../../src/utils/hash";
import { getCachedAnalysis, setCachedAnalysis } from "../../../src/utils/analysisCache";
import { extractResumeLocalSections } from "../../../src/extractors/resumeLocalExtractor";
import {
  dedupeNormalizedSlots,
  hasContactInfoSignals,
  buildCandidateSnapshotFallback,
  mergeSkillsContent,
  normalizeLocalResumeSectionsToSlots,
  sanitizeListForLanguage,
  sanitizeTextForLanguage,
} from "../../../src/engine/pipelineUtils";
import {
  containsHebrew,
  isMostlyHebrew,
  localizeCompletenessSectionLabel,
  localizeDecisionLabel,
  localizeMissingReason,
  localizeSlotTitle,
  normalizeLanguage,
} from "../../../src/product/localization";
import {
  PERFORMANCE_BUDGETS,
  estimateCostUsd,
  estimateTokenCount,
  formatPerformanceSummary,
  logBudgetWarning,
  logBudgetWarnings,
  startStageTimer,
} from "../../../src/utils/performanceLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function extractText(buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

const MAX_INPUT_CHARS = 25000;

const SKILL_KEYWORDS = {
  technical: ["SQL", "Python", "Java", "JavaScript", "React", "Selenium"],
  tools: ["Tableau", "Qlik", "Jira", "Monday", "TFS", "SAP", "ERP", "WMS", "POS", "PLM", "Excel", "Power BI"],
  business: ["ניתוח מערכות", "מנתח מערכות", "ניהול פרויקטים", "אפיון", "systems analysis", "project management", "requirements"],
  soft_skills: ["leadership", "communication", "teamwork", "presentation", "הובלה", "תקשורת", "עבודת צוות"],
};

const HEBREW_RESUME_IMPROVEMENT_FALLBACKS = {
  quick_wins: [
    "הוספת תמצית מועמד קצרה וברורה בראש קורות החיים.",
    "הוספת מקטע מיומנויות וכלים עם טכנולוגיות מרכזיות.",
  ],
  recommended: [
    "חידוד הישגים מדידים בתפקידים האחרונים.",
  ],
  high_impact: [
    "הבלטת ניסיון רלוונטי לתפקיד היעד לצד כלים וטכנולוגיות.",
  ],
};


function extractLocalSkillsFromText(text) {
  if (!text) return null;
  const groups = {
    technical: [],
    tools: [],
    business: [],
    soft_skills: [],
  };

  for (const [groupKey, terms] of Object.entries(SKILL_KEYWORDS)) {
    for (const term of terms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = /[A-Za-z]/.test(term)
        ? new RegExp(`\\b${escaped}\\b`, "i")
        : new RegExp(escaped, "i");
      if (regex.test(text)) {
        groups[groupKey].push(term);
      }
    }
  }

  const normalizedGroups = Object.fromEntries(
    Object.entries(groups)
      .map(([key, values]) => [
        key,
        Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))),
      ])
      .filter(([, values]) => values.length > 0),
  );

  return Object.keys(normalizedGroups).length > 0 ? normalizedGroups : null;
}


function inferDocumentTitle(text) {
  if (!text || !text.trim()) return null;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
  const titleCandidate = lines[0] || null;
  if (!titleCandidate) return null;
  if (titleCandidate.length > 180) return null;
  if (/^(page|section|נספח|attachment)\b/i.test(titleCandidate)) return null;
  return titleCandidate;
}

function finalizePerformanceLog(metrics) {
  const warnings = [];
  if (metrics.extractionMs > PERFORMANCE_BUDGETS.extraction) {
    warnings.push(`[PERF WARNING] extraction exceeded budget`);
  }
  if (metrics.qualityCheckMs > PERFORMANCE_BUDGETS.qualityCheck) {
    warnings.push(`[PERF WARNING] qualityCheck exceeded budget`);
  }
  if (metrics.classificationMs > PERFORMANCE_BUDGETS.classification) {
    warnings.push(`[PERF WARNING] classification exceeded budget`);
  }
  if (metrics.aiGenerationMs > PERFORMANCE_BUDGETS.aiGeneration) {
    warnings.push(`[PERF WARNING] aiGeneration exceeded budget`);
  }
  if (metrics.jsonParseMs > PERFORMANCE_BUDGETS.jsonParse) {
    warnings.push(`[PERF WARNING] jsonParse exceeded budget`);
  }
  if (metrics.totalMs > PERFORMANCE_BUDGETS.total) {
    warnings.push(`[PERF WARNING] total exceeded budget`);
  }

  if (warnings.length > 0) {
    logBudgetWarnings(warnings);
  }

  console.log(formatPerformanceSummary({ ...metrics, budgetWarnings: warnings }));
}

export async function POST(req) {
  try {
    const metrics = {
      documentType: "unknown",
      classificationSource: "unknown",
      cacheHit: false,
      model: "gpt-4o-mini",
      promptChars: 0,
      inputTokens: 0,
      inputTokenSource: "estimated",
      outputTokens: 0,
      outputTokenSource: "estimated",
      totalTokens: 0,
      totalTokenSource: "estimated",
      estimatedCost: null,
      extractionMs: 0,
      qualityCheckMs: 0,
      classificationMs: 0,
      aiGenerationMs: 0,
      jsonParseMs: 0,
      totalMs: 0,
    };

    const requestStart = Date.now();
    const logTotalTime = () => {
      metrics.totalMs = Date.now() - requestStart;
      console.log("[app/api/analyze] total-request-time", metrics.totalMs);
    };

    if (!process.env.OPENAI_API_KEY) {
      metrics.totalMs = Date.now() - requestStart;
      finalizePerformanceLog(metrics);
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      metrics.totalMs = Date.now() - requestStart;
      finalizePerformanceLog(metrics);
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const extractionTimer = startStageTimer("extraction", PERFORMANCE_BUDGETS.extraction);
    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    let text;
    try {
      text = await extractText(pdfBytes);
    } catch (error) {
      metrics.extractionMs = extractionTimer.stop().durationMs;
      metrics.totalMs = Date.now() - requestStart;
      console.error("[app/api/analyze] extraction error", error);
      finalizePerformanceLog(metrics);
      return Response.json(
        {
          error: true,
          stage: "extraction",
          message: "Document extraction failed.",
          details: "PDF parser failed in server runtime.",
        },
        { status: 500 },
      );
    }
    const trimmedText = text.trim();
    const extractedWordCount = trimmedText ? trimmedText.split(/\s+/).filter(Boolean).length : 0;
    const extractedHebrewCharCount = trimmedText ? (trimmedText.match(/[\u0590-\u05FF]/g) || []).length : 0;
    const extractedLatinCharCount = trimmedText ? (trimmedText.match(/[A-Za-z]/g) || []).length : 0;
    const extractedDigitCount = trimmedText ? (trimmedText.match(/[0-9]/g) || []).length : 0;
    const extractedLineCount = trimmedText ? trimmedText.split(/\r?\n/).filter(Boolean).length : 0;
    const firstNonSensitiveSampleLength = trimmedText ? trimmedText.replace(/\s+/g, " ").trim().slice(0, 120).length : 0;
    metrics.extractionMs = extractionTimer.stop().durationMs;
    console.log("[app/api/analyze] extraction-time", metrics.extractionMs);

    const qualityCheckTimer = startStageTimer("qualityCheck", PERFORMANCE_BUDGETS.qualityCheck);
    const quality = assessDocumentQuality(trimmedText);
    metrics.qualityCheckMs = qualityCheckTimer.stop().durationMs;
    console.log("[app/api/analyze] quality-debug", {
      extractedTextLength: trimmedText.length,
      extractedWordCount,
      extractedHebrewCharCount,
      extractedLatinCharCount,
      extractedDigitCount,
      extractedLineCount,
      firstNonSensitiveSampleLength,
      qualityIsValid: quality.isValid,
      qualityConfidence: quality.confidence,
      qualityReason: quality.reason,
      qualitySuggestedAction: quality.suggestedAction,
      qualityThresholds: DOCUMENT_QUALITY_THRESHOLDS,
    });
    if (!quality.isValid) {
      metrics.documentType = "invalid";
      logTotalTime();
      finalizePerformanceLog(metrics);
      return Response.json(
        {
          error: "Cannot analyze document.",
          reason: quality.reason,
          suggestedAction: quality.suggestedAction,
          confidence: quality.confidence,
        },
        { status: 400 },
      );
    }

    const classificationTimer = startStageTimer("classification", PERFORMANCE_BUDGETS.classification);
    const weakClassification = classifyDocumentType(trimmedText);
    const language = /[\u0590-\u05FF]/.test(trimmedText) ? "Hebrew" : "English";
    const textForPrompt = trimmedText.length > MAX_INPUT_CHARS ? trimmedText.slice(0, MAX_INPUT_CHARS) : trimmedText;
    const cacheKey = computeHash(textForPrompt);
    const cachedResult = getCachedAnalysis(cacheKey);
    if (cachedResult) {
      metrics.cacheHit = true;
      metrics.classificationSource = "cache";
      metrics.documentType = "cached";
      metrics.totalMs = Date.now() - requestStart;
      metrics.classificationMs = classificationTimer.stop().durationMs;
      console.log("[app/api/analyze] cache-hit", true);
      logTotalTime();
      finalizePerformanceLog(metrics);
      return Response.json(cachedResult, { status: 200 });
    }
    // Explicit cache-miss log
    console.log("[app/api/analyze] cache-hit", false);
    metrics.cacheHit = false;
    metrics.classificationMs = classificationTimer.stop().durationMs;

    const classificationPrompt = `You are a document type classifier. The allowed types are: resume, tender, contract, requirements, generic.
Return valid JSON only with {"type":"<type>","confidence":<number>}.
Confidence must be a decimal between 0 and 1.
If the text is uncertain, choose generic.
Use only the document text and do not rely on external knowledge.
Weak keyword classification suggests: ${weakClassification.docType} with confidence ${weakClassification.confidence}.
If the weak keyword signal is not strong, do not force a document type.

Document text:
${textForPrompt}`;

    let docType = "generic";
    let finalConfidence = 0;
    let classificationReason = weakClassification.reason;

    if (weakClassification.confidence >= 0.85) {
      docType = weakClassification.docType;
      finalConfidence = weakClassification.confidence;
      classificationReason = `Skipped AI classifier because local document signals were strong. ${weakClassification.reason}`;
      metrics.classificationSource = "local";
      console.log("[app/api/analyze] classification-source", "local");
    } else {
      const classificationResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a reliable document classifier. Always prefer generic over a wrong classification." },
          { role: "user", content: classificationPrompt },
        ],
        temperature: 0,
        max_tokens: 100,
      });
      metrics.classificationSource = "ai";
      console.log("[app/api/analyze] classification-source", "ai");

      const classificationRaw = classificationResponse.choices?.[0]?.message?.content || "";
      const classificationParse = safeParseAIJson(classificationRaw);
      let aiClassification;
      if (classificationParse.ok && classificationParse.data && typeof classificationParse.data === "object") {
        aiClassification = classificationParse.data;
      } else {
        aiClassification = { type: "generic", confidence: 0 };
      }

      const normalizeType = (value) => {
        const normalized = String(value || "").toLowerCase().trim();
        return supportedDocumentTypes.includes(normalized) ? normalized : "generic";
      };

      const finalType = normalizeType(aiClassification.type);
      finalConfidence = Number.isFinite(Number(aiClassification.confidence))
        ? Number(aiClassification.confidence)
        : 0;
      docType = finalConfidence >= 0.6 ? finalType : "generic";
      classificationReason = `AI classification result ${finalType} with confidence ${finalConfidence}. ${weakClassification.reason}`;
    }

    metrics.documentType = docType;

    const expert = experts[docType] ?? DEFAULT_EXPERT;
    const dashboard = documentDashboards[docType] ?? documentDashboards.generic;

    const promptPackage = buildPrompt({
      docType,
      expert,
      dashboard,
      language,
      text: textForPrompt,
    });

    metrics.promptChars = promptPackage.user.length + promptPackage.system.length;

    const aiMaxTokens = docType === "resume" ? 1400 : 1100;
    const aiGenerationTimer = startStageTimer("aiGeneration", PERFORMANCE_BUDGETS.aiGeneration);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: promptPackage.system,
        },
        { role: "user", content: promptPackage.user },
      ],
      temperature: 0,
      max_tokens: aiMaxTokens,
    });
    metrics.aiGenerationMs = aiGenerationTimer.stop().durationMs;

    const usage = response.usage;
    const inputTokenUsage = Number(usage?.prompt_tokens ?? 0);
    const outputTokenUsage = Number(usage?.completion_tokens ?? 0);
    const totalTokenUsage = Number(usage?.total_tokens ?? 0);

    metrics.inputTokens = inputTokenUsage > 0 ? inputTokenUsage : estimateTokenCount(promptPackage.user);
    metrics.inputTokenSource = inputTokenUsage > 0 ? "actual" : "estimated";
    metrics.outputTokens = outputTokenUsage > 0 ? outputTokenUsage : estimateTokenCount(response.choices?.[0]?.message?.content || "");
    metrics.outputTokenSource = outputTokenUsage > 0 ? "actual" : "estimated";
    metrics.totalTokens = totalTokenUsage > 0 ? totalTokenUsage : Math.max(metrics.inputTokens, 0) + Math.max(metrics.outputTokens, 0);
    metrics.totalTokenSource = totalTokenUsage > 0 ? "actual" : "estimated";
    metrics.estimatedCost = estimateCostUsd({
      model: metrics.model,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens,
    });

    const rawContent = response.choices?.[0]?.message?.content || "";
    const jsonParseTimer = startStageTimer("jsonParse", PERFORMANCE_BUDGETS.jsonParse);
    const parsedJson = safeParseAIJson(rawContent);
    metrics.jsonParseMs = jsonParseTimer.stop().durationMs;

    if (!parsedJson.ok) {
      console.error("[app/api/analyze] JSON parse failed", {
        rawContent,
        error: parsedJson.error,
        wasRepaired: parsedJson.wasRepaired,
      });

      const fallback = {
        document_type: docType,
        document_title: null,
        decision: {
          label: language === "Hebrew" ? "דורש בדיקה" : "Needs Review",
          confidence: 0.3,
          reason: language === "Hebrew"
            ? "הניתוח הופסק לפני שהושלם. נסה שוב או העלה מסמך קצר יותר."
            : "The analysis stopped before it completed. Please retry or upload a shorter document.",
        },
        slots: [],
        quality: {
          document_readability: Math.round((quality.confidence / 100) * 100) / 100,
          extraction_confidence: Math.round((quality.confidence / 100) * 100) / 100,
          classification_confidence: finalConfidence,
          warnings: [
            language === "Hebrew"
              ? "הניתוח הופסק לפני שהושלם. נסה שוב או העלה מסמך קצר יותר."
              : "The analysis stopped before it completed. Please retry or upload a shorter document.",
          ],
        },
      };
      logTotalTime();
      finalizePerformanceLog(metrics);
      return Response.json(fallback, { status: 200 });
    }

    const parsedResult = parsedJson.data;

    const uiLanguage = normalizeLanguage(language);
    const allowedSlotTypes = new Set(dashboard.slots.map((slot) => slot.type));
    const normalizedSlots = Array.isArray(parsedResult.slots) ? parsedResult.slots : [];
    const localResumeSections = docType === "resume" ? extractResumeLocalSections(trimmedText) : null;
    const aiSlots = normalizedSlots
      .map((slot) => {
        if (!slot || typeof slot !== "object") return null;
        const type = String(slot.type || "").trim();
        if (!allowedSlotTypes.has(type)) return null;

        const slotConfig = dashboard.slots.find((entry) => entry.type === type);
        if (!slotConfig) return null;

        const content = slot.content == null ? null : slot.content;
        const normalizedContent = Array.isArray(content)
          ? content.map((item) => (typeof item === "string" ? item.trim() : item))
          : typeof content === "string"
          ? content.trim()
          : content;
        const sanitizedContent = uiLanguage === "he" && type === "candidate_snapshot" && typeof normalizedContent === "string"
          ? sanitizeTextForLanguage(normalizedContent, uiLanguage, "", isMostlyHebrew)
          : normalizedContent;
        const title = localizeSlotTitle(type, slotConfig.title, uiLanguage);
        const priority = slotConfig.priority;
        const confidence = Number.isFinite(Number(slot.confidence)) ? Number(slot.confidence) : 0;
        const confidenceReason = typeof slot.confidence_reason === "string" ? slot.confidence_reason.trim() : undefined;
        const normalizedConfidenceReason = uiLanguage === "he"
          ? sanitizeTextForLanguage(confidenceReason, uiLanguage, "רמת הביטחון נקבעה לפי בהירות המידע במסמך.", isMostlyHebrew)
          : confidenceReason;
        const hasContent = sanitizedContent !== null && sanitizedContent !== "" && !(Array.isArray(sanitizedContent) && sanitizedContent.length === 0);

        // Server-side confidence filter: slots with confidence < 0.40 are hidden
        // unless their type includes "warning" or "gaps" (those always render)
        const isExemptFromConfidenceFilter = type.includes("warning") || type.includes("gaps");
        const meetsConfidenceThreshold = confidence >= 0.4 || isExemptFromConfidenceFilter;
        const shouldRender = hasContent && meetsConfidenceThreshold;

        return {
          type,
          title,
          priority,
          content: hasContent ? sanitizedContent : null,
          confidence,
          confidence_reason: normalizedConfidenceReason || undefined,
          evidence: null,
          shouldRender,
          source: "ai",
        };
      })
      .filter((slot) => slot !== null)
      // Also remove slots that are below threshold regardless of shouldRender
      .filter((slot) => {
        const isExempt = slot.type.includes("warning") || slot.type.includes("gaps");
        return slot.confidence >= 0.4 || isExempt;
      })
      .sort((a, b) => b.priority - a.priority);

    const localSlots = docType === "resume"
      ? normalizeLocalResumeSectionsToSlots({
          localResumeSections,
          dashboardSlots: dashboard.slots,
          uiLanguage,
          localizeTitle: localizeSlotTitle,
        })
      : [];
    const localSkills = docType === "resume" ? extractLocalSkillsFromText(trimmedText) : null;

    if (docType === "resume" && localSkills) {
      const aiSkillsSlot = aiSlots.find((slot) => slot.type === "skills_analysis") || null;
      const mergedSkillsContent = mergeSkillsContent(aiSkillsSlot?.content, localSkills);
      const skillsConfig = dashboard.slots.find((slot) => slot.type === "skills_analysis");
      if (skillsConfig && mergedSkillsContent) {
        localSlots.push({
          type: "skills_analysis",
          title: localizeSlotTitle("skills_analysis", skillsConfig.title, uiLanguage),
          priority: skillsConfig.priority,
          content: mergedSkillsContent,
          confidence: aiSkillsSlot ? Math.max(Number(aiSkillsSlot.confidence || 0), 0.72) : 0.72,
          confidence_reason: uiLanguage === "he"
            ? "מיומנויות וכלים זוהו ישירות מתוך קורות החיים."
            : "Skills and tools were detected directly from the resume text.",
          evidence: null,
          shouldRender: true,
          source: "local",
        });
      }
    }

    const warnings = [];
    if (docType === "generic") {
      warnings.push(
        uiLanguage === "he"
          ? "סוג המסמך לא היה ברור; יושם תצורה כללית של לוח מחוונים."
          : "Document type was unclear; generic dashboard config has been applied.",
      );
    }

    const decisionResult = parsedResult.decision && typeof parsedResult.decision === "object"
      ? parsedResult.decision
      : null;
    const decisionLabel = decisionResult && typeof decisionResult.label === "string" ? String(decisionResult.label).trim() : null;
    const decisionConfidence = decisionResult && Number.isFinite(Number(decisionResult.confidence)) ? Number(decisionResult.confidence) : finalConfidence;
    const decisionReason = decisionResult && typeof decisionResult.reason === "string" ? String(decisionResult.reason).trim() : null;

    // Pass-through explainability fields from the AI decision
    const rawDecisionFactors = Array.isArray(decisionResult?.factors)
      ? decisionResult.factors.filter((f) => typeof f === "string").map((f) => f.trim())
      : undefined;
    const rawDecisionMissingFactors = Array.isArray(decisionResult?.missing_factors)
      ? decisionResult.missing_factors.filter((f) => typeof f === "string").map((f) => f.trim())
      : undefined;
    const rawDecisionConfidenceReasons = Array.isArray(decisionResult?.confidence_reasons)
      ? decisionResult.confidence_reasons.filter((f) => typeof f === "string").map((f) => f.trim())
      : undefined;

    const decisionFactors = sanitizeListForLanguage(rawDecisionFactors, uiLanguage, isMostlyHebrew);
    const decisionMissingFactors = sanitizeListForLanguage(rawDecisionMissingFactors, uiLanguage, isMostlyHebrew);
    const decisionConfidenceReasons = sanitizeListForLanguage(rawDecisionConfidenceReasons, uiLanguage, isMostlyHebrew);
    const sanitizedDecisionReason = sanitizeTextForLanguage(
      decisionReason,
      uiLanguage,
      uiLanguage === "he"
        ? "נדרש חיזוק של נתונים מרכזיים כדי לתמוך בהחלטה חד-משמעית."
        : "Additional structured evidence is needed to support a stronger recommendation.",
      isMostlyHebrew,
    );

    // Pass-through improvements (language-guarded for Hebrew UI)
    let improvements;
    if (parsedResult.improvements && typeof parsedResult.improvements === "object") {
      const imp = parsedResult.improvements;
      const keepLocalizedItems = (value) => {
        const items = Array.isArray(value) ? value.filter((s) => typeof s === "string").map((s) => s.trim()).filter(Boolean) : [];
        if (uiLanguage !== "he") return items;
        return items.filter((s) => isMostlyHebrew(s));
      };
      improvements = {
        quick_wins: keepLocalizedItems(imp.quick_wins),
        recommended: keepLocalizedItems(imp.recommended),
        high_impact: keepLocalizedItems(imp.high_impact),
      };

      if (uiLanguage === "he") {
        if (improvements.quick_wins.length === 0) improvements.quick_wins = [...HEBREW_RESUME_IMPROVEMENT_FALLBACKS.quick_wins];
        if (improvements.recommended.length === 0) improvements.recommended = [...HEBREW_RESUME_IMPROVEMENT_FALLBACKS.recommended];
        if (improvements.high_impact.length === 0) improvements.high_impact = [...HEBREW_RESUME_IMPROVEMENT_FALLBACKS.high_impact];
      }
    }

    let documentCompleteness;
    if (docType === "resume") {
      const resumeSections = [
        { key: "experience", label: "Work Experience" },
        { key: "education", label: "Education" },
        { key: "skills", label: "Skills" },
        { key: "contact_info", label: "Contact Info" },
        { key: "languages", label: "Languages" },
        { key: "military_service", label: "Military Service" },
        { key: "projects", label: "Projects" },
        { key: "achievements", label: "Achievements" },
        { key: "certifications", label: "Certifications" },
      ];
      const lowerText = trimmedText.toLowerCase();
      const found = resumeSections.filter((section) => {
        const sectionText = section.label.toLowerCase();
        if (section.key === "experience") return /experience|ניסיון|תעסוק/i.test(lowerText);
        if (section.key === "education") return /education|השכלה|לימודים|לימוד/i.test(lowerText);
        if (section.key === "skills") return /skills|כישורים|מיומנויות|competencies/i.test(lowerText) || Boolean(localSkills);
        if (section.key === "contact_info") return hasContactInfoSignals(trimmedText);
        if (section.key === "languages") return /language|שפות|english|עברית/i.test(lowerText);
        if (section.key === "military_service") return /military|צבאי|שירות צבאי|שירות/i.test(lowerText);
        if (section.key === "projects") return /project|פרויקט|projects/i.test(lowerText);
        if (section.key === "achievements") return /achievement|הישג|achievements/i.test(lowerText);
        if (section.key === "certifications") return /certif|תעודה|הסמכה/i.test(lowerText);
        return sectionText && lowerText.includes(sectionText);
      }).map((section) => section.label);
      const missing = resumeSections.filter((section) => !found.includes(section.label)).map((section) => section.label);
      const localizedFound = found.map((label) => localizeCompletenessSectionLabel(label, uiLanguage));
      const localizedMissing = missing.map((label) => localizeCompletenessSectionLabel(label, uiLanguage));
      documentCompleteness = {
        found: localizedFound,
        missing: localizedMissing,
        missing_reasons: {
          [localizeCompletenessSectionLabel("Certifications", uiLanguage)]: localizeMissingReason("Certifications", undefined, uiLanguage),
          [localizeCompletenessSectionLabel("Achievements", uiLanguage)]: localizeMissingReason("Achievements", undefined, uiLanguage),
          [localizeCompletenessSectionLabel("Contact Info", uiLanguage)]: localizeMissingReason("Contact Info", undefined, uiLanguage),
          [localizeCompletenessSectionLabel("Skills", uiLanguage)]: localizeMissingReason("Skills", undefined, uiLanguage),
        },
      };
    } else if (parsedResult.document_completeness && typeof parsedResult.document_completeness === "object") {
      const dc = parsedResult.document_completeness;
      const foundItems = Array.isArray(dc.found) ? dc.found.filter((s) => typeof s === "string") : [];
      const missingItems = Array.isArray(dc.missing) ? dc.missing.filter((s) => typeof s === "string") : [];
      const localizedFound = foundItems.map((label) => localizeCompletenessSectionLabel(label, uiLanguage));
      const localizedMissing = missingItems.map((label) => localizeCompletenessSectionLabel(label, uiLanguage));
      const reasons = {};
      if (dc.missing_reasons && typeof dc.missing_reasons === "object") {
        for (const [key, value] of Object.entries(dc.missing_reasons)) {
          const localizedKey = localizeCompletenessSectionLabel(key, uiLanguage);
          reasons[localizedKey] = localizeMissingReason(key, typeof value === "string" ? value : undefined, uiLanguage);
        }
      }
      documentCompleteness = {
        found: localizedFound,
        missing: localizedMissing,
        missing_reasons: Object.keys(reasons).length > 0 ? reasons : undefined,
      };
    }

    const decisionCardContent = {
      reason: sanitizedDecisionReason || (uiLanguage === "he" ? "המערכת לא הצליחה לנתח את המסמך בצורה אמינה." : "The system could not reliably parse the AI analysis."),
      factors: decisionFactors || [],
      missing_factors: decisionMissingFactors || [],
      confidence_reasons: decisionConfidenceReasons || [],
    };

    const existingCandidateSlot = aiSlots.find((slot) => slot.type === "candidate_snapshot" && slot.shouldRender && slot.content)
      || localSlots.find((slot) => slot.type === "candidate_snapshot" && slot.shouldRender && slot.content);
    if (docType === "resume" && !existingCandidateSlot) {
      const candidateConfig = dashboard.slots.find((slot) => slot.type === "candidate_snapshot");
      const fallbackSummary = buildCandidateSnapshotFallback(trimmedText, uiLanguage);
      if (candidateConfig && fallbackSummary) {
        localSlots.push({
          type: "candidate_snapshot",
          title: localizeSlotTitle("candidate_snapshot", candidateConfig.title, uiLanguage),
          priority: candidateConfig.priority,
          content: fallbackSummary,
          confidence: 0.66,
          confidence_reason: uiLanguage === "he"
            ? "התמצית נבנתה מסימנים מפורשים שנמצאו בקורות החיים."
            : "Summary was composed from explicit resume signals.",
          evidence: null,
          shouldRender: true,
          source: "local",
        });
      }
    }

    const systemSlots = [
      {
        type: "decision_summary",
        title: localizeSlotTitle("decision_summary", "Recommendation / Decision Rationale", uiLanguage),
        priority: 10,
        content: decisionCardContent,
        confidence: decisionConfidence,
        confidence_reason: uiLanguage === "he" ? "הסבר ההחלטה מבוסס על ניתוח תוכן המסמך." : "Decision explanation is based on analyzed document content.",
        evidence: null,
        shouldRender: true,
        source: "system",
      },
    ];

    if (documentCompleteness && (documentCompleteness.found?.length || documentCompleteness.missing?.length)) {
      systemSlots.push({
        type: "document_completeness",
        title: localizeSlotTitle("document_completeness", "Document Completeness", uiLanguage),
        priority: 9,
        content: documentCompleteness,
        confidence: Math.max(0.4, Math.min(0.95, quality.confidence / 100)),
        confidence_reason: uiLanguage === "he" ? "שלמות המסמך חושבה מתוך נוכחות מקטעים מרכזיים." : "Completeness is derived from key section coverage.",
        evidence: null,
        shouldRender: true,
        source: "system",
      });
    }

    if (improvements && (improvements.quick_wins.length || improvements.recommended.length || improvements.high_impact.length)) {
      systemSlots.push({
        type: "improvement_actions",
        title: localizeSlotTitle("improvement_actions", "How to Strengthen This Document", uiLanguage),
        priority: 6,
        content: improvements,
        confidence: Math.max(0.4, Math.min(0.9, decisionConfidence || 0.5)),
        confidence_reason: uiLanguage === "he" ? "המלצות לשיפור נגזרו מהמידע שזוהה במסמך." : "Improvement guidance is derived from identified document content.",
        evidence: null,
        shouldRender: true,
        source: "system",
      });
    }

    const mergedSlots = dedupeNormalizedSlots([...aiSlots, ...localSlots, ...systemSlots])
      .slice(0, dashboard.maxVisibleSlots + 10);

    const normalizedResponse = {
      document_type: docType,
      document_title: inferDocumentTitle(trimmedText),
      language,
      decision: {
        label: localizeDecisionLabel(decisionLabel || "needs_review", uiLanguage),
        confidence: decisionConfidence,
        reason: sanitizedDecisionReason || (uiLanguage === "he" ? "המערכת לא הצליחה לנתח את המסמך בצורה אמינה." : "The system could not reliably parse the AI analysis."),
        ...(decisionFactors && decisionFactors.length > 0 ? { factors: decisionFactors } : {}),
        ...(decisionMissingFactors && decisionMissingFactors.length > 0 ? { missing_factors: decisionMissingFactors } : {}),
        ...(decisionConfidenceReasons && decisionConfidenceReasons.length > 0 ? { confidence_reasons: decisionConfidenceReasons } : {}),
      },
      slots: mergedSlots,
      quality: {
        document_readability: Math.round((quality.confidence / 100) * 100) / 100,
        extraction_confidence: Math.round((quality.confidence / 100) * 100) / 100,
        classification_confidence: finalConfidence,
        warnings,
        classification_reason: uiLanguage === "he"
          ? "הסיווג נקבע על בסיס התוכן שזוהה במסמך."
          : classificationReason,
      },
      ...(improvements ? { improvements } : {}),
      ...(documentCompleteness ? { document_completeness: documentCompleteness } : {}),
    };

    setCachedAnalysis(cacheKey, normalizedResponse);

    logTotalTime();
    finalizePerformanceLog(metrics);
    return Response.json(normalizedResponse, { status: 200 });
  } catch (e) {
    console.error("[app/api/analyze] error", e);
    return Response.json(
      {
        error: true,
        stage: "server",
        message: "Request processing failed.",
      },
      { status: 500 },
    );
  }
}
