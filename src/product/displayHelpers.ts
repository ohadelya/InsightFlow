/**
 * displayHelpers.ts
 *
 * Pure utility module — zero React imports.
 * All business-logic helpers for display decisions live here.
 * UI components consume these helpers; they do not own the logic.
 *
 * Architecture layer: Decision Engine / Dashboard Renderer bridge
 */

import { localizeDecisionLabel, localizeDocumentTypeLabel, localizeSlotTitle, normalizeLanguage } from "./localization";

export function getDocumentTypeLabel(
  docType: string | undefined,
  language: string | undefined,
): string {
  return localizeDocumentTypeLabel(docType, normalizeLanguage(language));
}

export function getDecisionLabel(label: string | undefined, language: string | undefined): string {
  return localizeDecisionLabel(label, normalizeLanguage(language));
}

// ---------------------------------------------------------------------------
// Language direction
// ---------------------------------------------------------------------------

export function getLanguageDirection(language: string | undefined): "rtl" | "ltr" {
  return normalizeLanguage(language) === "he" ? "rtl" : "ltr";
}

// ---------------------------------------------------------------------------
// Slot title formatting
// ---------------------------------------------------------------------------

export function formatSlotTitle(
  slot: { title?: string; type: string },
  language: string | undefined,
): string {
  return localizeSlotTitle(slot.type, slot.title, normalizeLanguage(language));
}

// ---------------------------------------------------------------------------
// Priority labels — visual only, no raw number exposed to UI
//
// ≥ 8 → "חשוב מאוד" / "Very Important"  (red)
// ≥ 5 → "חשוב"      / "Important"       (yellow)
// < 5 → "מידע תומך" / "Supporting Info" (gray)
// ---------------------------------------------------------------------------

export type PriorityTier = "very-important" | "important" | "supporting";

export function getSlotPriorityTier(priority: number): PriorityTier {
  if (!Number.isFinite(priority)) return "supporting";
  if (priority >= 8) return "very-important";
  if (priority >= 5) return "important";
  return "supporting";
}

export function getSlotPriorityLabel(
  priority: number,
  language: string | undefined,
): string {
  const tier = getSlotPriorityTier(priority);
  if (language === "Hebrew") {
    if (tier === "very-important") return "חשוב מאוד";
    if (tier === "important") return "חשוב";
    return "מידע תומך";
  }
  if (tier === "very-important") return "Very Important";
  if (tier === "important") return "Important";
  return "Supporting Info";
}

// ---------------------------------------------------------------------------
// Confidence — new bands
//
// 0.80–1.00 → "רמת ביטחון גבוהה"  / "High confidence"
// 0.60–0.79 → "רמת ביטחון בינונית"/ "Moderate confidence"
// 0.40–0.59 → "רמת ביטחון נמוכה"  / "Low confidence"
// < 0.40    → hidden (shouldHideByConfidence = true)
// ---------------------------------------------------------------------------

export type ConfidenceTier = "high" | "moderate" | "low" | "hidden";

export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (!Number.isFinite(confidence)) return "hidden";
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6) return "moderate";
  if (confidence >= 0.4) return "low";
  return "hidden";
}

export function getConfidenceLabel(
  confidence: number,
  language: string | undefined,
): string {
  if (!Number.isFinite(confidence)) {
    return language === "Hebrew" ? "לא ידוע" : "Unknown";
  }

  const tier = getConfidenceTier(confidence);

  if (language === "Hebrew") {
    if (tier === "high") return "רמת ביטחון גבוהה";
    if (tier === "moderate") return "רמת ביטחון בינונית";
    if (tier === "low") return "רמת ביטחון נמוכה";
    return "ביטחון נמוך מאוד";
  }

  if (tier === "high") return "High confidence";
  if (tier === "moderate") return "Moderate confidence";
  if (tier === "low") return "Low confidence";
  return "Very low confidence";
}

/**
 * Returns true when a slot should be hidden because its confidence is too low
 * to be decision-ready. Warning/gap slots are exempt.
 */
export function shouldHideByConfidence(confidence: number): boolean {
  return getConfidenceTier(confidence) === "hidden";
}

/**
 * Explanatory helper text shown below the "Confidence" section header.
 * Reminds the user that confidence reflects data clarity, not quality.
 */
export function getConfidenceHelperText(language: string | undefined): string {
  if (language === "Hebrew") {
    return "רמת הביטחון משקפת עד כמה המידע הופיע בצורה ברורה במסמך שהועלה. היא אינה ציון איכות של האדם או המסמך.";
  }
  return "Confidence reflects how clearly the information appeared in the uploaded document. It is not a quality score.";
}
