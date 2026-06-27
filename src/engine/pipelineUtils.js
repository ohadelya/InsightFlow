const FACTUAL_LOCAL_SLOT_TYPES = new Set([
  "languages",
  "military_service",
  "education",
  "certifications",
  "key_projects",
  "achievements",
]);

const RESUME_LOCAL_SLOT_MAP = [
  { type: "languages", sectionKey: "languages" },
  { type: "military_service", sectionKey: "military_service" },
  { type: "education", sectionKey: "education" },
  { type: "certifications", sectionKey: "certifications" },
  { type: "key_projects", sectionKey: "projects" },
  { type: "achievements", sectionKey: "achievements" },
];

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim())));
}

function sanitizeTextForLanguage(value, uiLanguage, fallbackValue = "", isMostlyHebrew = () => false) {
  if (!value || typeof value !== "string") return fallbackValue;
  if (uiLanguage !== "he") return value.trim();
  return isMostlyHebrew(value) ? value.trim() : fallbackValue;
}

function sanitizeListForLanguage(values, uiLanguage, isMostlyHebrew = () => false) {
  const list = uniqueStrings(Array.isArray(values) ? values : []);
  if (uiLanguage !== "he") return list;
  return list.filter((value) => isMostlyHebrew(value));
}

function hasContactInfoSignals(text) {
  if (!text) return false;

  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phonePattern = /(?:\+?\d[\d\s\-()]{7,}\d)/;
  const linkedInPattern = /(?:linkedin\.com|לינקדאין)/i;
  const githubPattern = /(?:github\.com|github)/i;
  const portfolioPattern = /(?:portfolio|behance|dribbble|אתר\s*אישי|אתר\s*פרופיל)/i;
  const locationPattern = /(?:^|\s)(?:city|location|located|address|כתובת|מיקום|עיר|מגורים)(?:\s|:|$)/i;
  const labelPattern = /(?:טלפון|נייד|דוא"?ל|מייל|אימייל|כתובת|לינקדאין|github|פרטי\s+קשר)/i;

  return [
    emailPattern,
    phonePattern,
    linkedInPattern,
    githubPattern,
    portfolioPattern,
    locationPattern,
    labelPattern,
  ].some((pattern) => pattern.test(text));
}

function buildCandidateSnapshotFallback(text, uiLanguage) {
  if (!text || text.length < 120) return null;

  const rolePatterns = [
    { regex: /(מנתח\/?ת?\s+מערכות|systems?\s+analyst)/i, he: "מנתח/ת מערכות", en: "systems analyst" },
    { regex: /(מנהל\/?ת?\s+פרויקטים|project\s+manager)/i, he: "מנהל/ת פרויקטים", en: "project manager" },
    { regex: /(qa|בודק\/?ת?\s+תוכנה|quality\s+assurance)/i, he: "איש/אשת QA", en: "QA professional" },
    { regex: /(data\s+analyst|אנליסט\/?ית?\s+נתונים)/i, he: "אנליסט/ית נתונים", en: "data analyst" },
  ];
  const orientationPatterns = [
    { regex: /(ניתוח\s+מערכות|systems?\s+analysis)/i, he: "ניתוח מערכות", en: "systems analysis" },
    { regex: /(ניהול\s+פרויקטים|project\s+management)/i, he: "ניהול פרויקטים", en: "project management" },
    { regex: /(data|נתונים)/i, he: "עבודה עם נתונים", en: "data-oriented work" },
  ];

  const roleMatch = rolePatterns.find((entry) => entry.regex.test(text));
  const orientationMatch = orientationPatterns.find((entry) => entry.regex.test(text));

  let years = null;
  const yearsMatch = text.match(/(?:ניסיון\s+של\s*)?(\d{1,2})\+?\s*(?:שנות\s+ניסיון|years?\s+of\s+experience)/i);
  if (yearsMatch) {
    years = Number(yearsMatch[1]);
  } else {
    const yearCandidates = (text.match(/\b(19|20)\d{2}\b/g) || []).map((v) => Number(v));
    if (yearCandidates.length > 1) {
      const earliest = Math.min(...yearCandidates);
      const latest = Math.max(...yearCandidates);
      const currentYear = new Date().getFullYear();
      const estimated = Math.max(0, Math.min(currentYear, latest) - earliest);
      if (estimated >= 2 && estimated <= 40) {
        years = estimated;
      }
    }
  }

  if (!roleMatch && !orientationMatch && !years) return null;

  if (uiLanguage === "he") {
    const sentenceOneParts = [];
    if (roleMatch) sentenceOneParts.push(`מועמד/ת עם ניסיון כ${roleMatch.he}`);
    if (!roleMatch && orientationMatch) sentenceOneParts.push(`מועמד/ת בעל/ת אוריינטציה ל${orientationMatch.he}`);
    if (years) sentenceOneParts.push(`עם כ-${years} שנות ניסיון`);

    const sentenceOne = sentenceOneParts.length > 0 ? `${sentenceOneParts.join(" ")}.` : null;
    const sentenceTwo = orientationMatch ? `מיקוד מקצועי ב${orientationMatch.he}.` : null;
    return [sentenceOne, sentenceTwo].filter(Boolean).slice(0, 2).join(" ");
  }

  const sentenceOne = roleMatch
    ? `Candidate has experience as a ${roleMatch.en}${years ? ` with approximately ${years} years of experience` : ""}.`
    : years
    ? `Candidate has approximately ${years} years of experience.`
    : null;
  const sentenceTwo = orientationMatch ? `Professional orientation includes ${orientationMatch.en}.` : null;
  return [sentenceOne, sentenceTwo].filter(Boolean).slice(0, 2).join(" ");
}

function normalizeSkillsGroupKey(key) {
  const normalized = String(key || "").toLowerCase();
  if (["technical", "tech", "technologies", "technology"].includes(normalized)) return "technical";
  if (["tools", "platforms"].includes(normalized)) return "tools";
  if (["business", "domain"].includes(normalized)) return "business";
  if (["soft_skills", "softskills", "soft", "interpersonal"].includes(normalized)) return "soft_skills";
  return null;
}

function normalizeSkillsContent(content) {
  const groups = {
    technical: [],
    tools: [],
    business: [],
    soft_skills: [],
  };

  if (Array.isArray(content)) {
    groups.technical.push(...content.filter((item) => typeof item === "string"));
  } else if (typeof content === "string") {
    groups.technical.push(...content.split(/[;,|]/).map((value) => value.trim()).filter(Boolean));
  } else if (content && typeof content === "object") {
    for (const [key, value] of Object.entries(content)) {
      const groupKey = normalizeSkillsGroupKey(key);
      if (!groupKey) continue;
      if (Array.isArray(value)) {
        groups[groupKey].push(...value.filter((item) => typeof item === "string"));
      } else if (typeof value === "string") {
        groups[groupKey].push(...value.split(/[;,|]/).map((item) => item.trim()).filter(Boolean));
      }
    }
  }

  const normalized = Object.fromEntries(
    Object.entries(groups)
      .map(([key, values]) => [key, uniqueStrings(values)])
      .filter(([, values]) => values.length > 0),
  );

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mergeSkillsContent(aiContent, localContent) {
  const aiGroups = normalizeSkillsContent(aiContent) || {};
  const localGroups = normalizeSkillsContent(localContent) || {};
  const merged = {};

  for (const groupKey of ["technical", "tools", "business", "soft_skills"]) {
    const mergedValues = uniqueStrings([...(aiGroups[groupKey] || []), ...(localGroups[groupKey] || [])]);
    if (mergedValues.length > 0) {
      merged[groupKey] = mergedValues;
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

function dedupeNormalizedSlots(slots) {
  const byType = new Map();

  for (const slot of slots) {
    if (!slot || !slot.type) continue;
    const existing = byType.get(slot.type);
    if (!existing) {
      byType.set(slot.type, slot);
      continue;
    }

    const isFactualType = FACTUAL_LOCAL_SLOT_TYPES.has(slot.type);
    const slotSource = String(slot.source || "ai");
    const existingSource = String(existing.source || "ai");
    const useLocalForFactual = isFactualType && slotSource === "local" && existingSource !== "local";
    const useLocalForSkills = slot.type === "skills_analysis" && slotSource === "local" && existingSource !== "local";
    const keepHigherConfidence = Number(slot.confidence || 0) > Number(existing.confidence || 0);

    if (useLocalForFactual || useLocalForSkills || keepHigherConfidence) {
      byType.set(slot.type, slot);
    }
  }

  return Array.from(byType.values()).sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
}

function normalizeLocalResumeSectionsToSlots({
  localResumeSections,
  dashboardSlots,
  uiLanguage,
  localizeTitle,
}) {
  const localSlots = [];
  if (!localResumeSections) return localSlots;

  for (const entry of RESUME_LOCAL_SLOT_MAP) {
    const section = localResumeSections[entry.sectionKey];
    if (!section || section.confidence < 0.6 || !Array.isArray(section.items) || section.items.length === 0) continue;

    const slotConfig = dashboardSlots.find((slot) => slot.type === entry.type);
    if (!slotConfig) continue;

    localSlots.push({
      type: entry.type,
      title: localizeTitle(entry.type, slotConfig.title, uiLanguage),
      priority: slotConfig.priority,
      content: section.items,
      confidence: section.confidence,
      confidence_reason: section.source === "explicit-header"
        ? (uiLanguage === "he"
          ? "המידע זוהה מתוך כותרת או פסקת תוכן ברורים בקורות החיים."
          : "This information was detected from an explicit resume heading or nearby content.")
        : (uiLanguage === "he"
          ? "המידע זוהה באמצעות דפוסי משמעות סמוכים בקורות החיים."
          : "This information was inferred from nearby semantic patterns in the resume."),
      evidence: section.evidence || null,
      shouldRender: true,
      source: "local",
    });
  }

  return localSlots;
}

export {
  dedupeNormalizedSlots,
  hasContactInfoSignals,
  buildCandidateSnapshotFallback,
  mergeSkillsContent,
  normalizeSkillsContent,
  normalizeLocalResumeSectionsToSlots,
  sanitizeListForLanguage,
  sanitizeTextForLanguage,
};
