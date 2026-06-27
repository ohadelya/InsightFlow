import { supportedDocumentTypes, keywordMap, resumeStructureSignals, type DocumentType } from "./keywords";

export type ClassificationResult = {
  docType: DocumentType | "generic";
  confidence: number;
  reason: string;
};

function countSignals(text: string, signals: string[]) {
  return signals.reduce((count, signal) => (text.includes(signal) ? count + 1 : count), 0);
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

  if (resumeSignals.score >= 8) {
    return {
      docType: "resume",
      confidence: Math.min(1, 0.7 + resumeSignals.hard * 0.05 + resumeSignals.medium * 0.03),
      reason: `Strong resume structure detected. ${resumeSignals.reason}`,
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
