export type DocumentQualityResult = {
  isValid: boolean;
  confidence: number;
  reason: string;
  suggestedAction: "continue" | "reject" | "retry_ocr";
};

export const DOCUMENT_QUALITY_THRESHOLDS = {
  minimumWordCount: 80,
  minimumHebrewChars: 300,
  minimumLatinChars: 300,
  minimumMeaningfulChars: 500,
} as const;

export function assessDocumentQuality(text: string): DocumentQualityResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      isValid: false,
      confidence: 0,
      reason: "No extractable text found",
      suggestedAction: "reject",
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const textLength = trimmed.length;
  const whitespaceCount = (trimmed.match(/\s/g) || []).length;
  const hebrewCharCount = (trimmed.match(/[\u0590-\u05FF]/g) || []).length;
  const latinCharCount = (trimmed.match(/[A-Za-z]/g) || []).length;
  const digitCount = (trimmed.match(/[0-9]/g) || []).length;
  const meaningfulCharacterCount = hebrewCharCount + latinCharCount + digitCount;
  const nonPrintableCount = (trimmed.match(/[^\x09\x0A\x0D\x20-\x7E\u0590-\u05FF]/g) || []).length;
  const uniqueWords = new Set(words.map((word) => word.toLowerCase())).size;
  const lineCount = trimmed.split(/\r?\n/).filter(Boolean).length;

  const nonPrintableRatio = nonPrintableCount / Math.max(1, textLength);
  const whitespaceRatio = whitespaceCount / Math.max(1, textLength);
  const uniqueWordRatio = uniqueWords / Math.max(1, wordCount);
  const symbolRatio = Math.max(0, 1 - meaningfulCharacterCount / Math.max(1, textLength));

  let confidence = 0;
  confidence += Math.min(35, wordCount * 1.2);
  confidence += Math.min(20, hebrewCharCount * 0.04);
  confidence += Math.min(20, latinCharCount * 0.04);
  confidence += Math.min(10, digitCount * 0.08);
  confidence += Math.min(15, whitespaceRatio * 15);
  confidence += Math.min(15, uniqueWordRatio * 15);
  confidence = Math.max(0, Math.min(100, confidence - nonPrintableRatio * 40 - symbolRatio * 30));

  const hasStrongSignal = wordCount >= DOCUMENT_QUALITY_THRESHOLDS.minimumWordCount
    || hebrewCharCount >= DOCUMENT_QUALITY_THRESHOLDS.minimumHebrewChars
    || latinCharCount >= DOCUMENT_QUALITY_THRESHOLDS.minimumLatinChars
    || meaningfulCharacterCount >= DOCUMENT_QUALITY_THRESHOLDS.minimumMeaningfulChars;
  const isExtremelyWeak = textLength < 25 || meaningfulCharacterCount < 25;
  const looksMostlySymbols = symbolRatio > 0.6 || meaningfulCharacterCount < 20;
  const looksScanned = wordCount < 15 && meaningfulCharacterCount < 100 && lineCount <= 4;

  if (isExtremelyWeak) {
    return {
      isValid: false,
      confidence,
      reason: "No extractable text found",
      suggestedAction: "reject",
    };
  }

  if (looksMostlySymbols) {
    return {
      isValid: false,
      confidence,
      reason: "Text extraction produced mostly symbols",
      suggestedAction: "retry_ocr",
    };
  }

  if (!hasStrongSignal) {
    return {
      isValid: false,
      confidence,
      reason: looksScanned ? "Likely scanned PDF without OCR" : "Very low meaningful text count",
      suggestedAction: "retry_ocr",
    };
  }

  return {
    isValid: true,
    confidence,
    reason: "Document text quality is sufficient for analysis.",
    suggestedAction: "continue",
  };
}
