type ResumeLocalSection = {
  items: string[];
  confidence: number;
  source: "explicit-header" | "semantic-pattern";
  evidence: string[];
};

type ResumeLocalExtraction = {
  professional_summary?: ResumeLocalSection;
  languages?: ResumeLocalSection;
  military_service?: ResumeLocalSection;
  education?: ResumeLocalSection;
  certifications?: ResumeLocalSection;
  projects?: ResumeLocalSection;
  achievements?: ResumeLocalSection;
};

type ResumeSectionBoundaryDiagnostic = {
  sectionType: keyof ResumeLocalExtraction;
  startIndex: number;
  endIndex: number;
  confidence: number;
};

type ResumeExtractionDiagnostics = {
  headerCandidates: string[];
  boundaries: ResumeSectionBoundaryDiagnostic[];
};

type SectionDefinition = {
  sectionType: keyof ResumeLocalExtraction;
  headerAliases: RegExp[];
  includePatterns: RegExp[];
  excludePatterns: RegExp[];
  maxItems: number;
  minConfidence: number;
};

const GENERIC_SECTION_HEADER_HINT = /^(ניסיון\s+תעסוקתי|experience|work\s+experience|מיומנויות|skills?|כישורים|contact|פרטי\s+קשר|projects?|פרויקטים|certifications?|הסמכות|achievements?|הישגים|references?)\b[:\-\s]*$/i;

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    sectionType: "professional_summary",
    headerAliases: [/תמצית\s+מקצועית|פרופיל\s+מקצועי|summary|professional\s+summary|profile|about\s+me/i],
    includePatterns: [/(מנוסה|ניסיון|professional|experienced|specializ|התמח|focus|מומח|analytics?|analysis|project\s+management|ניהול\s+פרויקטים|systems?\s+analysis|ניתוח\s+מערכות)/i],
    excludePatterns: [/(תואר|השכלה|university|college|שירות\s+צבאי|צה"?ל|idf|language|שפות|email|@|טלפון|phone)/i],
    maxItems: 2,
    minConfidence: 0.58,
  },
  {
    sectionType: "languages",
    headerAliases: [/שפות|שפה|שליטה\s+בשפות|ידע\s+בשפות|language\s+skills?|languages?/i],
    includePatterns: [/(hebrew|english|arabic|french|spanish|russian|עברית|אנגלית|ערבית|צרפתית|ספרדית|רוסית|native|fluent|bilingual|mother\s+tongue|שפת\s+אם|שליטה\s+מלאה|advanced|intermediate|basic)/i],
    excludePatterns: [/(צה"?ל|idf|שירות\s+צבאי|קבע|מפקד|officer|commander|university|college|תואר|degree)/i],
    maxItems: 4,
    minConfidence: 0.6,
  },
  {
    sectionType: "military_service",
    headerAliases: [/שירות\s+צבאי|שירות\s+צבאי\s+וקבע|military\s+service|army/i],
    includePatterns: [/(idf|צה"?ל|military|army|officer|commander|מפקד|קבע|שירות\s+צבאי|לוחם|גדוד)/i],
    excludePatterns: [/(university|college|education|תואר|השכלה|degree|b\.a\.?|b\.sc\.?)/i],
    maxItems: 3,
    minConfidence: 0.6,
  },
  {
    sectionType: "education",
    headerAliases: [/השכלה|לימודים|education|academic\s+background|b\.a\.?|b\.sc\.?|university|college/i],
    includePatterns: [/(education|academic|university|college|degree|b\.a\.?|b\.sc\.?|masters|mba|phd|graduate|student|השכלה|לימודים|תואר|אוניברסיטה|מכללה)/i],
    excludePatterns: [/(צה"?ל|idf|שירות\s+צבאי|commander|language\s+skills|שפות|native|fluent)/i],
    maxItems: 4,
    minConfidence: 0.6,
  },
  {
    sectionType: "certifications",
    headerAliases: [/הסמכות|תעודות|קורסים|certifications?|courses?/i],
    includePatterns: [/(certification|certificate|course|certified|licensed|הסמכה|תעודה|קורס)/i],
    excludePatterns: [/(education|university|college|military|צה"?ל|idf)/i],
    maxItems: 4,
    minConfidence: 0.6,
  },
  {
    sectionType: "projects",
    headerAliases: [/פרויקטים|פרויקטים\s+מרכזיים|projects?|selected\s+projects?|key\s+projects?/i],
    includePatterns: [/(project|פרויקט|implemented|delivered|built|developed|launched|led|designed)/i],
    excludePatterns: [/(education|degree|military|idf|צה"?ל|language\s+skills|שפות)/i],
    maxItems: 4,
    minConfidence: 0.6,
  },
  {
    sectionType: "achievements",
    headerAliases: [/הישגים|achievements?|impact|highlights?/i],
    includePatterns: [/(improved|reduced|increased|saved|led|managed|delivered|implemented|achieved|optimized|enhanced|הובלתי|שיפרתי|חסכתי|ניהלתי)/i],
    excludePatterns: [/(education|degree|military|idf|language\s+skills|שפות)/i],
    maxItems: 4,
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

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((acc, pattern) => acc + (pattern.test(text) ? 1 : 0), 0);
}

function looksLikeSectionHeader(line: string, definition: SectionDefinition) {
  const normalized = normalizeLine(line);
  if (!normalized) return false;
  if (/^[\-•*▪]/.test(normalized)) return false;

  const matchedHeader = definition.headerAliases.find((pattern) => {
    const localPattern = new RegExp(pattern.source, pattern.flags);
    const match = localPattern.exec(normalized);
    if (!match || match.index == null || match.index > 14) return false;
    const prefix = normalized.slice(0, match.index).trim();
    if (prefix && !/^[\d\s\-•*▪|:.()]+$/.test(prefix)) return false;
    return true;
  });

  return Boolean(matchedHeader);
}

function getHeaderMatch(line: string, definition: SectionDefinition) {
  const normalized = normalizeLine(line);
  if (!normalized) return null;

  const matchedHeader = definition.headerAliases.find((pattern) => {
    const localPattern = new RegExp(pattern.source, pattern.flags);
    const match = localPattern.exec(normalized);
    if (!match || match.index == null || match.index > 14) return false;
    const prefix = normalized.slice(0, match.index).trim();
    if (prefix && !/^[\d\s\-•*▪|:.()]+$/.test(prefix)) return false;
    return true;
  });
  if (!matchedHeader) return null;

  const localPattern = new RegExp(matchedHeader.source, matchedHeader.flags);
  const match = localPattern.exec(normalized);
  if (!match || match.index == null) return null;
  return { normalized, headerText: match[0], index: match.index };
}

function compactItem(value: string, definition: SectionDefinition) {
  const cleaned = normalizeLine(value)
    .replace(/^[\-•*▪]\s*/, "")
    .replace(/^\s*[-–]\s*/, "")
    .trim();

  if (!cleaned) return [];

  if (definition.sectionType === "languages") {
    return cleaned
      .split(/[;|,]/)
      .map((part) => normalizeLine(part))
      .filter((part) => countMatches(part, definition.includePatterns) > 0)
      .slice(0, definition.maxItems);
  }

  const sentenceChunks = cleaned
    .split(/(?:\s*[•▪·]\s*|\s{2,}|\s*\|\s*)/)
    .map((part) => normalizeLine(part))
    .filter(Boolean);

  const filtered = sentenceChunks
    .filter((part) => countMatches(part, definition.excludePatterns) === 0)
    .slice(0, definition.maxItems)
    .map((part) => (part.length > 170 ? `${part.slice(0, 167)}...` : part));

  if (definition.sectionType === "professional_summary") {
    return filtered
      .filter((part) => !GENERIC_SECTION_HEADER_HINT.test(part))
      .filter((part) => !/ניסיון\s+תעסוקתי/i.test(part))
      .filter((part) => !/^\d{4}\s*[-–]/.test(part))
      .slice(0, definition.maxItems);
  }

  return filtered;
}

function evaluateLineForSection(line: string, definition: SectionDefinition) {
  const includeHits = countMatches(line, definition.includePatterns);
  const excludeHits = countMatches(line, definition.excludePatterns);
  return includeHits - excludeHits;
}

type HeaderCandidate = {
  sectionType: keyof ResumeLocalExtraction;
  definition: SectionDefinition;
  startIndex: number;
  headerText: string;
  line: string;
};

function detectHeaderCandidates(lines: string[]) {
  const rawCandidates: HeaderCandidate[] = [];

  lines.forEach((line, index) => {
    for (const definition of SECTION_DEFINITIONS) {
      const headerMatch = getHeaderMatch(line, definition);
      if (!headerMatch) continue;
      rawCandidates.push({
        sectionType: definition.sectionType,
        definition,
        startIndex: index,
        headerText: headerMatch.headerText,
        line: headerMatch.normalized,
      });
    }
  });

  const bestByIndex = new Map<number, HeaderCandidate>();
  for (const candidate of rawCandidates) {
    const existing = bestByIndex.get(candidate.startIndex);
    if (!existing) {
      bestByIndex.set(candidate.startIndex, candidate);
      continue;
    }

    if (candidate.headerText.length > existing.headerText.length) {
      bestByIndex.set(candidate.startIndex, candidate);
    }
  }

  return Array.from(bestByIndex.values()).sort((a, b) => a.startIndex - b.startIndex);
}

function buildSectionFromRange(
  lines: string[],
  candidate: HeaderCandidate,
  endIndex: number,
): { section: ResumeLocalSection; boundary: ResumeSectionBoundaryDiagnostic } | null {
  const headerMatch = getHeaderMatch(lines[candidate.startIndex] || "", candidate.definition);
  if (!headerMatch) return null;

  const contentLines: string[] = [];
  const tail = headerMatch.normalized.slice(headerMatch.index + headerMatch.headerText.length).replace(/^[:\-–\s|]+/, "").trim();
  if (tail) {
    contentLines.push(tail);
  }

  for (let index = candidate.startIndex + 1; index < endIndex; index += 1) {
    const line = normalizeLine(lines[index] || "");
    if (!line) continue;
    if (GENERIC_SECTION_HEADER_HINT.test(line)) break;
    contentLines.push(line);
  }

  const scoredLines = contentLines
    .map((line) => ({ line, score: evaluateLineForSection(line, candidate.definition) }))
    .filter(({ score }) => score > 0);

  const bestLines = scoredLines.length > 0
    ? scoredLines.map(({ line }) => line)
    : contentLines.filter((line) => countMatches(line, candidate.definition.includePatterns) > 0);

  if (bestLines.length === 0) return null;

  const compacted = compactItem(bestLines.join(" | "), candidate.definition);
  const items = compacted.filter(Boolean).slice(0, candidate.definition.maxItems);
  if (items.length === 0) return null;

  const includeHits = countMatches(bestLines.join(" "), candidate.definition.includePatterns);
  const excludeHits = countMatches(bestLines.join(" "), candidate.definition.excludePatterns);
  const confidence = Math.max(
    0,
    Math.min(
      0.96,
      0.68 + Math.min(0.2, includeHits * 0.05) - Math.min(0.14, excludeHits * 0.06),
    ),
  );

  if (confidence < candidate.definition.minConfidence) return null;

  return {
    section: {
      items,
      confidence,
      source: "explicit-header",
      evidence: [`header:${candidate.headerText}`],
    },
    boundary: {
      sectionType: candidate.sectionType,
      startIndex: candidate.startIndex,
      endIndex: Math.max(candidate.startIndex, endIndex - 1),
      confidence,
    },
  };
}

function extractFromLineStructure(lines: string[]) {
  const sections: Partial<Record<keyof ResumeLocalExtraction, ResumeLocalSection>> = {};
  const boundaries: ResumeSectionBoundaryDiagnostic[] = [];
  const headerCandidates = detectHeaderCandidates(lines);

  for (let i = 0; i < headerCandidates.length; i += 1) {
    const candidate = headerCandidates[i];
    const next = headerCandidates[i + 1];
    const endIndex = next ? next.startIndex : lines.length;
    const built = buildSectionFromRange(lines, candidate, endIndex);
    if (!built) continue;

    const existing = sections[candidate.sectionType];
    if (!existing || built.section.confidence > existing.confidence) {
      sections[candidate.sectionType] = built.section;
      const existingBoundaryIndex = boundaries.findIndex((entry) => entry.sectionType === candidate.sectionType);
      if (existingBoundaryIndex >= 0) {
        boundaries[existingBoundaryIndex] = built.boundary;
      } else {
        boundaries.push(built.boundary);
      }
    }
  }

  return {
    sections,
    boundaries,
    headerCandidates: headerCandidates.map((candidate) => `${candidate.sectionType}:${candidate.headerText}`).slice(0, 10),
  };
}

function getHeaderMatchAnywhere(text: string, definition: SectionDefinition) {
  const normalized = normalizeLine(text);
  if (!normalized) return null;

  for (const pattern of definition.headerAliases) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const globalPattern = new RegExp(pattern.source, flags);
    const match = globalPattern.exec(normalized);
    if (!match || match.index == null) continue;

    const tail = normalized.slice(match.index + match[0].length);
    const hasTailSignal = countMatches(tail.slice(0, 180), definition.includePatterns) > 0;
    if (!hasTailSignal) continue;

    return {
      headerText: match[0],
      index: match.index,
      normalized,
    };
  }

  return null;
}

function extractFromFlattenedText(text: string) {
  const normalized = normalizeLine(text);
  if (!normalized) {
    return {
      sections: {},
      boundaries: [],
      headerCandidates: [],
    };
  }

  const locatedHeaders = SECTION_DEFINITIONS
    .map((definition) => {
      const match = getHeaderMatchAnywhere(normalized, definition);
      if (!match) return null;
      return {
        sectionType: definition.sectionType,
        definition,
        headerText: match.headerText,
        startIndex: match.index,
      };
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.startIndex - b.startIndex);

  const sections: Partial<Record<keyof ResumeLocalExtraction, ResumeLocalSection>> = {};
  const boundaries: ResumeSectionBoundaryDiagnostic[] = [];

  for (let i = 0; i < locatedHeaders.length; i += 1) {
    const current = locatedHeaders[i];
    const next = locatedHeaders[i + 1];
    const contentStart = current.startIndex + current.headerText.length;
    const contentEnd = next ? next.startIndex : normalized.length;
    const rawContent = normalizeLine(normalized.slice(contentStart, contentEnd).replace(/^[:\-–\s|]+/, ""));
    if (!rawContent) continue;

    const includeHits = countMatches(rawContent, current.definition.includePatterns);
    const excludeHits = countMatches(rawContent, current.definition.excludePatterns);
    if (includeHits === 0 || includeHits <= excludeHits) continue;

    const items = compactItem(rawContent, current.definition).slice(0, current.definition.maxItems);
    if (items.length === 0) continue;

    const confidence = Math.max(0, Math.min(0.92, 0.7 + Math.min(0.16, includeHits * 0.04) - Math.min(0.12, excludeHits * 0.06)));
    if (confidence < current.definition.minConfidence) continue;

    sections[current.sectionType] = {
      items,
      confidence,
      source: "semantic-pattern",
      evidence: [`flattened-header:${current.headerText}`],
    };

    boundaries.push({
      sectionType: current.sectionType,
      startIndex: current.startIndex,
      endIndex: Math.max(current.startIndex, contentEnd - 1),
      confidence,
    });
  }

  return {
    sections,
    boundaries,
    headerCandidates: locatedHeaders.map((entry) => `${entry.sectionType}:${entry.headerText}`).slice(0, 10),
  };
}

function analyzeResumeSections(text: string) {
  const lines = splitIntoSegments(text);

  const structured = extractFromLineStructure(lines);
  if (Object.keys(structured.sections).length > 0 || lines.length > 3) {
    return structured;
  }

  return extractFromFlattenedText(text);
}

export function extractResumeLocalSections(extractedText: string): ResumeLocalExtraction {
  const trimmedText = extractedText?.trim() ?? "";
  if (!trimmedText) return {};

  return analyzeResumeSections(trimmedText).sections;
}

export function extractResumeSectionDiagnostics(extractedText: string): ResumeExtractionDiagnostics {
  const trimmedText = extractedText?.trim() ?? "";
  if (!trimmedText) {
    return {
      headerCandidates: [],
      boundaries: [],
    };
  }

  const analyzed = analyzeResumeSections(trimmedText);
  return {
    headerCandidates: analyzed.headerCandidates,
    boundaries: analyzed.boundaries,
  };
}
