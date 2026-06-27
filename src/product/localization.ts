// PRODUCT OWNER SAFE TO EDIT
// Central localization mapping for user-facing labels and explanations.

export type DashboardLanguage = "he" | "en";

const DECISION_LABELS = {
  en: {
    positive: "Recommended",
    review: "Needs Additional Review",
    negative: "Low Match",
    insufficient: "Insufficient Information",
    needs_review: "Needs Review",
  },
  he: {
    positive: "מתאים להמשך בדיקה",
    review: "דורש בדיקה נוספת",
    negative: "התאמה חלשה",
    insufficient: "לא מספיק מידע",
    needs_review: "דורש בדיקה",
  },
} as const;

// PRODUCT OWNER SAFE TO EDIT
export const DOCUMENT_TYPE_LABELS = {
  en: {
    resume: "Resume",
    contract: "Contract",
    tender: "Tender / RFP",
    requirements: "Requirements / Specifications",
    generic: "General Document",
  },
  he: {
    resume: "קורות חיים",
    contract: "חוזה",
    tender: "מכרז / RFP",
    requirements: "דרישות / אפיון",
    generic: "מסמך כללי",
  },
} as const;

// PRODUCT OWNER SAFE TO EDIT
export const SLOT_TITLE_LABELS = {
  en: {
    candidate_snapshot: "Candidate Snapshot",
    professional_profile: "Professional Profile",
    relevant_experience: "Relevant Experience",
    skills_analysis: "Skills Analysis",
    military_service: "Military Service",
    languages: "Languages",
    key_projects: "Key Projects",
    achievements: "Achievements",
    education: "Education",
    certifications: "Certifications",
    gaps_or_missing_info: "Gaps or Missing Information",
    interview_questions: "Interview Questions",
    next_step_recommendation: "Next Step Recommendation",
    decision_summary: "Recommendation / Decision Rationale",
    document_completeness: "Document Completeness",
    improvement_actions: "How to Strengthen This Document",
  },
  he: {
    candidate_snapshot: "תמצית מועמד",
    professional_profile: "פרופיל מקצועי",
    relevant_experience: "ניסיון רלוונטי",
    skills_analysis: "מיומנויות וכלים",
    military_service: "שירות צבאי",
    languages: "שפות",
    key_projects: "פרויקטים מרכזיים",
    achievements: "הישגים",
    education: "השכלה",
    certifications: "הסמכות",
    gaps_or_missing_info: "פערים או מידע חסר",
    interview_questions: "שאלות לראיון",
    next_step_recommendation: "המלצת המשך",
    decision_summary: "המלצה והסבר",
    document_completeness: "שלמות המסמך",
    improvement_actions: "איך ניתן לחזק את המסמך",
  },
} as const;

// PRODUCT OWNER SAFE TO EDIT
const COMPLETENESS_SECTION_LABELS = {
  en: {
    "Work Experience": "Work Experience",
    Education: "Education",
    Languages: "Languages",
    "Military Service": "Military Service",
    Projects: "Projects",
    Skills: "Skills",
    "Contact Info": "Contact Info",
    Achievements: "Achievements",
    Certifications: "Certifications",
  },
  he: {
    "Work Experience": "ניסיון תעסוקתי",
    Education: "השכלה",
    Languages: "שפות",
    "Military Service": "שירות צבאי",
    Projects: "פרויקטים",
    Skills: "מיומנויות",
    "Contact Info": "פרטי קשר",
    Achievements: "הישגים",
    Certifications: "הסמכות",
  },
} as const;

// PRODUCT OWNER SAFE TO EDIT
const MISSING_REASON_FALLBACKS = {
  en: {
    Achievements: "Measurable achievements help demonstrate real-world impact.",
    Certifications: "Certifications can strengthen professional credibility.",
    "Contact Info": "Contact details help recruiters continue the process without friction.",
    Skills: "A clear skills breakdown helps validate fit quickly.",
  },
  he: {
    Achievements: "הישגים מדידים עוזרים להבין את ההשפעה בפועל של המועמד.",
    Certifications: "הסמכות יכולות לחזק אמינות מקצועית בתחומים טכנולוגיים או מקצועיים.",
    "Contact Info": "פרטי קשר מאפשרים למגייס להמשיך בתהליך ללא חיכוך.",
    Skills: "פירוט מיומנויות עוזר להבין התאמה מקצועית ראשונית.",
  },
} as const;

export function normalizeLanguage(language: string | undefined): DashboardLanguage {
  if (!language) return "en";
  return /hebrew|^he$/i.test(language) ? "he" : "en";
}

export function containsHebrew(text: string | undefined): boolean {
  if (!text) return false;
  return /[\u0590-\u05FF]/.test(text);
}

export function isMostlyHebrew(text: string | undefined): boolean {
  if (!text) return false;
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  if (hebrewChars === 0) return false;
  return hebrewChars >= latinChars;
}

export function localizeDecisionLabel(label: string | undefined, language: DashboardLanguage): string {
  const value = String(label || "").trim();
  if (!value) return language === "he" ? "דורש בדיקה" : "Needs Review";

  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  const mapped = DECISION_LABELS[language][normalized as keyof typeof DECISION_LABELS[typeof language]];
  if (mapped) return mapped;

  // Already localized or custom labels.
  return value;
}

export function localizeDocumentTypeLabel(docType: string | undefined, language: DashboardLanguage): string {
  const normalizedType = String(docType || "generic").toLowerCase() as keyof typeof DOCUMENT_TYPE_LABELS.en;
  return DOCUMENT_TYPE_LABELS[language][normalizedType] || DOCUMENT_TYPE_LABELS[language].generic;
}

export function localizeSlotTitle(type: string, fallbackTitle: string | undefined, language: DashboardLanguage): string {
  const key = String(type || "").trim() as keyof typeof SLOT_TITLE_LABELS.en;
  const mapped = SLOT_TITLE_LABELS[language][key];
  if (mapped) return mapped;
  return fallbackTitle || type.replace(/_/g, " ");
}

export function localizeCompletenessSectionLabel(label: string, language: DashboardLanguage): string {
  const mapped = COMPLETENESS_SECTION_LABELS[language][label as keyof typeof COMPLETENESS_SECTION_LABELS.en];
  return mapped || label;
}

export function localizeMissingReason(sectionLabel: string, existingReason: string | undefined, language: DashboardLanguage): string | undefined {
  if (existingReason && (language === "en" || containsHebrew(existingReason))) {
    return existingReason;
  }

  const fallback = MISSING_REASON_FALLBACKS[language][sectionLabel as keyof typeof MISSING_REASON_FALLBACKS.en];
  return fallback || existingReason;
}
