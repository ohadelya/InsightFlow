type ResumeLocalSection = {
  items: string[];
  confidence: number;
  source: "explicit-header" | "semantic-pattern";
  evidence: string[];
};

type ResumeLocalExtraction = {
  languages?: ResumeLocalSection;
  military_service?: ResumeLocalSection;
  education?: ResumeLocalSection;
  certifications?: ResumeLocalSection;
  projects?: ResumeLocalSection;
  achievements?: ResumeLocalSection;
};

type SectionDefinition = {
  sectionType: keyof ResumeLocalExtraction;
  headerAliases: RegExp[];
  semanticPatterns: RegExp[];
  itemPatterns: RegExp[];
  minConfidence: number;
};

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    sectionType: "languages",
    headerAliases: [/שפות|שפה|שליטה\s+בשפות|ידע\s+בשפות|language\s+skills?|languages?/i],
    semanticPatterns: [/\b(hebrew|english|עברית|אנגלית|native|fluent|bilingual|mother\s+tongue|basic|intermediate|advanced)\b/i],
    itemPatterns: [/\b(hebrew|english|עברית|אנגלית|native|fluent|bilingual|mother\s+tongue|basic|intermediate|advanced)\b/i],
    minConfidence: 0.6,
  },
  {
    sectionType: "military_service",
    headerAliases: [/שירות\s+צבאי|שירות\s+צבאי\s+וקבע|צה"?ל|idf|military\s+service|army/i],
    semanticPatterns: [/\b(idf|צה"?ל|military|army|officer|commander|מפקד|קבע|שירות\s+צבאי)\b/i],
    itemPatterns: [/\b(idf|צה"?ל|military|army|officer|commander|מפקד|קבע|שירות\s+צבאי)\b/i],
    minConfidence: 0.6,
  },
  {
    sectionType: "education",
    headerAliases: [/השכלה|לימודים|תואר|education|academic\s+background|b\.a\.?|b\.sc\.?|university|college/i],
    semanticPatterns: [/\b(education|academic|university|college|degree|b\.a\.?|b\.sc\.?|masters|mba|phd|graduate|student|השכלה|לימודים|תואר)\b/i],
    itemPatterns: [/\b(university|college|degree|b\.a\.?|b\.sc\.?|masters|mba|phd|graduate|student|השכלה|לימודים|תואר)\b/i],
    minConfidence: 0.6,
  },
  {
    sectionType: "certifications",
    headerAliases: [/הסמכות|תעודות|קורסים|certifications?|courses?/i],
    semanticPatterns: [/\b(certification|certificate|course|certified|licensed|הסמכה|תעודה|קורס)\b/i],
    itemPatterns: [/\b(certification|certificate|course|certified|licensed|הסמכה|תעודה|קורס)\b/i],
    minConfidence: 0.6,
  },
  {
    sectionType: "projects",
    headerAliases: [/פרויקטים|פרויקטים\s+מרכזיים|projects?|selected\s+projects?|key\s+projects?/i],
    semanticPatterns: [/\b(project|פרויקט|implemented|delivered|built|developed|launched|led|designed)\b/i],
    itemPatterns: [/\b(project|פרויקט|implemented|delivered|built|developed|launched|led|designed)\b/i],
    minConfidence: 0.6,
  },
  {
    sectionType: "achievements",
    headerAliases: [/הישגים|achievements?|impact|highlights?/i],
    semanticPatterns: [/\b(improved|reduced|increased|saved|led|managed|delivered|implemented|achieved|optimized|enhanced|הובילתי|שיפרתי|חסכתי|ניהלתי)\b/i],
    itemPatterns: [/\b(improved|reduced|increased|saved|led|managed|delivered|implemented|achieved|optimized|enhanced|הובילתי|שיפרתי|חסכתי|ניהלתי)\b/i],
    minConfidence: 0.6,
  },
];

function normalizeLine(line: string) {
  return line.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function splitIntoSegments(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);
}

function looksLikeAnyKnownSectionHeader(line: string) {
  return SECTION_DEFINITIONS.some((definition) => looksLikeSectionHeader(line, definition));
}

function looksLikeSectionHeader(line: string, definition: SectionDefinition) {
  const normalized = normalizeLine(line);
  if (!normalized) return false;
  if (/^[\-•*▪]/.test(normalized)) return false;

  const matchedHeader = definition.headerAliases.find((pattern) => {
    const match = pattern.exec(normalized);
    return match && match.index != null && match.index <= 6;
  });

  return Boolean(matchedHeader);
}

function getHeaderMatch(line: string, definition: SectionDefinition) {
  const normalized = normalizeLine(line);
  if (!normalized) return null;

  const matchedHeader = definition.headerAliases.find((pattern) => {
    const match = pattern.exec(normalized);
    return match && match.index != null && match.index <= 6;
  });
  if (!matchedHeader) return null;

  const match = matchedHeader.exec(normalized);
  if (!match || match.index == null) return null;
  return { normalized, headerText: match[0], index: match.index };
}

function getHeaderMatchAnywhere(text: string, definition: SectionDefinition) {
  const normalized = normalizeLine(text);
  if (!normalized) return null;

  let bestMatch: { headerText: string; index: number } | null = null;
  for (const pattern of definition.headerAliases) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const globalPattern = new RegExp(pattern.source, flags);
    let match = globalPattern.exec(normalized);
    while (match) {
      if (match.index != null) {
        const index = match.index;
        const headerText = match[0];
        const prevChar = index > 0 ? normalized[index - 1] : "";
        const hasLeftBoundary = index === 0 || /[\s|.;:,()\[\]{}]/.test(prevChar);

        if (hasLeftBoundary) {
          const tail = normalized.slice(index + headerText.length);
          const hasSeparatorCue = /^\s*[:\-|]/.test(tail) || /^\s+\d/.test(tail);
          const hasSemanticTail = definition.semanticPatterns.some((semanticPattern) => semanticPattern.test(tail.slice(0, 80)));

          if (hasSeparatorCue || hasSemanticTail) {
            if (!bestMatch || index < bestMatch.index) {
              bestMatch = { headerText, index };
            }
            break;
          }
        }
      }
      match = globalPattern.exec(normalized);
    }
  }

  if (!bestMatch) return null;
  return { normalized, headerText: bestMatch.headerText, index: bestMatch.index };
}

function compactItem(value: string, sectionType: SectionDefinition["sectionType"]) {
  const cleaned = normalizeLine(value)
    .replace(/^[\-•*▪]\s*/, "")
    .replace(/^[A-Za-z\u0590-\u05FF]+\s*:\s*/, "")
    .replace(/^\s*[-–]\s*/, "")
    .trim();

  if (!cleaned) return null;
  if (cleaned.length > 120) return `${cleaned.slice(0, 117)}...`;

  if (sectionType === "languages") {
    return cleaned
      .split(/[;|,]/)
      .map((part) => normalizeLine(part).replace(/^[-–]\s*/, ""))
      .filter(Boolean)
      .slice(0, 3);
  }

  return [cleaned];
}

function buildSectionCandidate(lines: string[], startIndex: number, definition: SectionDefinition) {
  const header = getHeaderMatch(lines[startIndex] ?? "", definition);
  if (!header) return null;

  const contentSegments: string[] = [];
  const remainder = header.normalized.slice(header.index + header.headerText.length).trim();
  if (remainder) {
    contentSegments.push(remainder.replace(/^[:\-–\s]+/, ""));
  }

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const candidateLine = normalizeLine(lines[index] ?? "");
    if (!candidateLine) continue;
    if (looksLikeAnyKnownSectionHeader(candidateLine)) break;
    if (/^(summary|experience|skills|contact|references|portfolio|technical\s+skills|computer\s+skills|about|profile)$/i.test(candidateLine)) break;
    contentSegments.push(candidateLine);
  }

  const content = contentSegments.join(" ").trim();
  if (!content) return null;

  const compacted = compactItem(content, definition.sectionType);
  if (!compacted) return null;

  const items = Array.isArray(compacted) ? compacted : [compacted];
  const semanticHits = definition.semanticPatterns.filter((pattern) => pattern.test(content)).length;
  const itemHits = definition.itemPatterns.filter((pattern) => pattern.test(content)).length;
  const confidence = Math.min(0.95, 0.75 + Math.min(0.12, semanticHits * 0.05) + Math.min(0.08, itemHits * 0.03));

  if (confidence < definition.minConfidence) return null;

  return {
    items: items.slice(0, 4),
    confidence,
    source: "explicit-header" as const,
    evidence: [`header:${header.normalized}`],
  } satisfies ResumeLocalSection;
}

function extractFlattenedSections(text: string) {
  const normalized = normalizeLine(text);
  if (!normalized) return {} as Partial<Record<keyof ResumeLocalExtraction, ResumeLocalSection>>;

  const locatedHeaders = SECTION_DEFINITIONS.map((definition) => {
    const header = getHeaderMatchAnywhere(normalized, definition);
    if (!header) return null;
    return { definition, ...header };
  })
    .filter((entry) => entry !== null)
    .sort((left, right) => left.index - right.index);

  const result: Partial<Record<keyof ResumeLocalExtraction, ResumeLocalSection>> = {};
  for (let i = 0; i < locatedHeaders.length; i += 1) {
    const current = locatedHeaders[i];
    const next = locatedHeaders[i + 1];
    const contentStart = current.index + current.headerText.length;
    const contentEnd = next ? next.index : normalized.length;
    const rawContent = normalized.slice(contentStart, contentEnd).replace(/^[:\-–\s]+/, "").trim();
    if (!rawContent) continue;

    const compacted = compactItem(rawContent, current.definition.sectionType);
    if (!compacted) continue;

    const items = Array.isArray(compacted) ? compacted : [compacted];
    const semanticHits = current.definition.semanticPatterns.filter((pattern) => pattern.test(rawContent)).length;
    if (semanticHits === 0) continue;
    const confidence = Math.min(0.95, 0.72 + Math.min(0.15, semanticHits * 0.06) + Math.min(0.08, items.length * 0.03));
    if (confidence < current.definition.minConfidence) continue;

    result[current.definition.sectionType] = {
      items: items.slice(0, 4),
      confidence,
      source: "semantic-pattern",
      evidence: [`flattened-header:${current.headerText}`],
    };
  }

  return result;
}

function extractSectionValues(text: string) {
  const lines = splitIntoSegments(text);
  const result: Partial<Record<keyof ResumeLocalExtraction, ResumeLocalSection>> = {};

  for (const definition of SECTION_DEFINITIONS) {
    const candidates: ResumeLocalSection[] = [];

    lines.forEach((line, index) => {
      if (!looksLikeSectionHeader(line, definition)) return;
      const candidate = buildSectionCandidate(lines, index, definition);
      if (candidate) {
        candidates.push(candidate);
      }
    });

    candidates.sort((left, right) => right.confidence - left.confidence);
    const best = candidates[0];
    if (best && best.confidence >= definition.minConfidence) {
      result[definition.sectionType] = best;
    }
  }

  if (Object.keys(result).length === 0 && lines.length <= 2) {
    const flattened = extractFlattenedSections(text);
    return { ...result, ...flattened };
  }

  return result;
}

export function extractResumeLocalSections(extractedText: string): ResumeLocalExtraction {
  const trimmedText = extractedText?.trim() ?? "";
  if (!trimmedText) return {};

  return extractSectionValues(trimmedText);
}
