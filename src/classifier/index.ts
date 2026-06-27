import { supportedDocumentTypes, keywordMap, resumeStructureSignals, type DocumentType } from "./keywords";

export type ClassificationResult = {
  docType: DocumentType | "generic";
  confidence: number;
  reason: string;
  /** True when classification was determined by resume structural signals rather than keyword scoring alone. */
  structuralOverride?: boolean;
};

function countSignals(text: string, signals: string[]) {
  return signals.reduce((count, signal) => (text.includes(signal) ? count + 1 : count), 0);
}

/**
 * Counts how many distinct resume structural categories are present in the
 * normalised (lowercased) document text.  Each category contributes at most 1
 * regardless of how many individual signals within it match.
 *
 * Thresholds (used in classifyDocumentType):
 *   ≥ 4 categories → resume, confidence ≥ 0.85
 *   ≥ 3 categories → resume, confidence = 0.72
 */
function evaluateResumeCategories(normalizedText: string): { count: number; categories: Record<string, boolean> } {
  const categories: Record<string, boolean> = {
    contact_info:
      /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/.test(normalizedText) ||
      normalizedText.includes("טלפון") ||
      normalizedText.includes("מייל") ||
      normalizedText.includes("אימייל") ||
      normalizedText.includes("linkedin") ||
      normalizedText.includes("phone:") ||
      normalizedText.includes("email:"),
    experience:
      normalizedText.includes("ניסיון") ||
      normalizedText.includes("תעסוקתי") ||
      normalizedText.includes("experience") ||
      normalizedText.includes("employment"),
    education:
      normalizedText.includes("השכלה") ||
      normalizedText.includes("לימודים") ||
      normalizedText.includes("תואר") ||
      normalizedText.includes("education") ||
      normalizedText.includes("university") ||
      normalizedText.includes("college") ||
      normalizedText.includes("אוניברסיטה") ||
      normalizedText.includes("מכללה"),
    skills:
      normalizedText.includes("מיומנויות") ||
      normalizedText.includes("כישורים") ||
      normalizedText.includes("skills") ||
      normalizedText.includes("sql") ||
      normalizedText.includes("python") ||
      normalizedText.includes("java"),
    languages:
      normalizedText.includes("שפות") ||
      normalizedText.includes("languages") ||
      (normalizedText.includes("עברית") && normalizedText.includes("אנגלית")),
    military_service:
      normalizedText.includes("שירות צבאי") ||
      normalizedText.includes('צה"ל') ||
      normalizedText.includes("צהל") ||
      normalizedText.includes("military") ||
      normalizedText.includes("idf"),
    professional_summary:
      normalizedText.includes("פרופיל") ||
      normalizedText.includes("תמצית") ||
      normalizedText.includes("summary") ||
      normalizedText.includes("profile"),
    resume_header:
      normalizedText.includes("קורות חיים") ||
      normalizedText.includes("curriculum vitae") ||
      /\bresume\b/.test(normalizedText),
  };

  const count = Object.values(categories).filter(Boolean).length;
  return { count, categories };
}

function evaluateResumeStructure(text: string) {
  const normalized = text.toLowerCase();
  const hard = countSignals(normalized, resumeStructureSignals.hard);
  const medium = countSignals(normalized, resumeStructureSignals.medium);
  const weak = countSignals(normalized, resumeStructureSignals.weak);
  const score = hard * 3 + medium * 2 + weak;
  const reason = `Resume structure signals: hard=${hard}, medium=${medium}, weak=${weak}, score=${score}.`;
  return { hard, medium, weak, score, reason };
}

export function classifyDocumentType(text: string): ClassificationResult {
  if (!text || !text.trim()) {
    return { docType: "generic", confidence: 0, reason: "No text available." };
  }

  const normalized = text.toLowerCase();
  const resumeSignals = evaluateResumeStructure(normalized);
  const { count: categoryCount } = evaluateResumeCategories(normalized);

  if (resumeSignals.score >= 8) {
    return {
      docType: "resume",
      confidence: Math.min(1, 0.7 + resumeSignals.hard * 0.05 + resumeSignals.medium * 0.03),
      reason: `Strong resume structure detected. ${resumeSignals.reason}`,
      structuralOverride: true,
    };
  }

  // Structural override: broad category coverage beats narrow keyword scoring.
  // Handles Hebrew resumes where RTL text ordering may scatter multi-word signals.
  if (categoryCount >= 4) {
    return {
      docType: "resume",
      confidence: Math.min(0.97, 0.85 + (categoryCount - 4) * 0.03),
      reason: `Resume structural override: ${categoryCount}/8 resume categories detected. ${resumeSignals.reason}`,
      structuralOverride: true,
    };
  }

  if (categoryCount >= 3) {
    return {
      docType: "resume",
      confidence: 0.72,
      reason: `Resume category threshold: ${categoryCount}/8 resume categories detected. ${resumeSignals.reason}`,
      structuralOverride: true,
    };
  }

  const scores = supportedDocumentTypes.reduce((acc, type) => {
    acc[type] = keywordMap[type].reduce(
      (score, keyword) => score + (normalized.includes(keyword) ? 1 : 0),
      0,
    );
    return acc;
  }, {} as Record<DocumentType, number>);

  const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!bestMatch || bestMatch[1] < 1) {
    return { docType: "generic", confidence: 0, reason: `No strong keyword match. ${resumeSignals.reason}` };
  }

  const maxScore = Math.max(...Object.values(scores));
  const totalScore = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const confidence = totalScore > 0 ? Number((maxScore / totalScore).toFixed(2)) : 0;
  const fallbackReason = resumeSignals.score > 4 ? `${resumeSignals.reason} Resume support is moderate.` : resumeSignals.reason;

  return {
    docType: bestMatch[0] as DocumentType,
    confidence,
    reason: `Keyword classification selected ${bestMatch[0]} with count ${bestMatch[1]}. ${fallbackReason}`,
  };
}
