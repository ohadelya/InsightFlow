export type DocumentFact = {
  text: string;
  confidence: number;
  source: "document";
};

const factKeywords = [
  "shall",
  "must",
  "agreement",
  "deadline",
  "payment",
  "compensation",
  "contract",
  "scope",
  "party",
  "vendor",
  "client",
  "requirement",
  "risk",
  "liability",
  "termination",
  "warranty",
  "obligation",
  "responsibility",
  "deliverable",
  "acceptance",
  "date",
  "amount",
  "rate",
  "price",
  "salary",
  "hours",
  "cost",
  "fee",
];

function normalizeSentence(sentence: string) {
  return sentence
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–—\s]+/, "")
    .replace(/[\s\n]+$/, "");
}

function sentenceConfidence(sentence: string) {
  let score = 10;
  const normalized = sentence.toLowerCase();
  if (/\d/.test(sentence)) score += 30;
  if (/\b(date|deadline|effective date|until|by|before)\b/.test(normalized)) score += 15;
  if (/\b(amount|salary|fee|cost|price|rate)\b/.test(normalized)) score += 15;
  if (/\b(pay|payment|compensation|monthly|annual)\b/.test(normalized)) score += 10;
  if (factKeywords.some((keyword) => normalized.includes(keyword))) score += 10;
  if (/\b(shall|must|should|required|required to|is required)\b/.test(normalized)) score += 10;
  if (/[A-Z][a-z]+\s[A-Z][a-z]+/.test(sentence)) score += 5;
  return Math.min(100, score);
}

export function extractFacts(text: string): DocumentFact[] {
  if (!text || !text.trim()) {
    return [];
  }

  const cleanedText = text.replace(/\r/g, " ").replace(/\n{2,}/g, "\n");
  const sentenceMatches = cleanedText.match(/[^.!?\n]+[.!?]?/g) || [cleanedText];

  const candidateFacts = sentenceMatches
    .map((rawSentence) => normalizeSentence(rawSentence))
    .filter((sentence) => sentence.length > 20)
    .map((sentence) => ({
      sentence,
      score: sentenceConfidence(sentence),
    }))
    .filter((data) => data.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((data) => ({
      text: data.sentence,
      confidence: data.score,
      source: "document" as const,
    }));

  const seen = new Set<string>();
  return candidateFacts.filter((fact) => {
    if (seen.has(fact.text)) return false;
    seen.add(fact.text);
    return true;
  });
}
