import type { DocumentType } from "../classifier/keywords";

export type ProductDocumentType = DocumentType | "generic";

export type SlotVisibility = "required" | "recommended" | "optional";

export interface ProductSlotConfig {
  type: string;
  title: string;
  helperText: string;
  priority: number;
  visibility: SlotVisibility;
}

export interface ProductDecisionLabels {
  ready: string;
  review: string;
  verify: string;
  fallback: string;
}

export interface ProductDashboardConfig {
  docType: ProductDocumentType;
  displayName: string;
  audience?: string;
  maxVisibleSlots: number;
  defaultTone: string;
  decisionLabels: ProductDecisionLabels;
  defaultDecisionReasons: {
    ready: string;
    review: string;
    verify: string;
    fallback: string;
  };
  slots: ProductSlotConfig[];
}

export type ProductSlotContent = string | string[] | Record<string, unknown> | null;

export interface ProductSlot {
  type: string;
  title: string;
  content: ProductSlotContent;
  evidence?: {
    source_section?: string;
    reason: string;
  } | null;
  priority: number;
  confidence: number;
  shouldRender: boolean;
  /** NEW: one short sentence explaining why this confidence was assigned */
  confidence_reason?: string;
  source?: "ai" | "local" | "system";
}

export interface ProductDecision {
  label: string;
  reason: string;
  confidence: number;
  /** NEW: key factors that influenced the decision (3–5 bullets) */
  factors?: string[];
  /** NEW: what was absent that would have strengthened the decision */
  missing_factors?: string[];
  /** NEW: overall reasons why the decision and confidence were assigned */
  confidence_reasons?: string[];
}

/** NEW: which sections were found vs. missing in the document */
export interface DocumentCompleteness {
  found: string[];
  missing: string[];
  /** Optional per-missing-item explanations */
  missing_reasons?: Record<string, string>;
}

export interface ProductResponse {
  document_type: ProductDocumentType;
  document_title: string | null;
  candidate_name?: string | null;
  language: "English" | "Hebrew";
  decision: ProductDecision;
  slots: ProductSlot[];
  quality: {
    document_readability: number;
    extraction_confidence: number;
    classification_confidence: number;
    warnings: string[];
    classification_reason?: string;
  };
  /** NEW: actionable ways to strengthen the document */
  improvements?: {
    quick_wins: string[];
    recommended: string[];
    high_impact: string[];
  };
  /** NEW: section completeness checklist */
  document_completeness?: DocumentCompleteness;
}
