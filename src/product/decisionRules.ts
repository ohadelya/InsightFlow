import type { ProductDashboardConfig, ProductDecision } from "../types/product";

export function pickDecisionLabel(
  dashboard: ProductDashboardConfig,
  confidence: number,
  hasRiskySlots: boolean,
): ProductDecision {
  const normalized = Math.min(Math.max(confidence, 0), 1);
  if (dashboard.docType === "generic") {
    return {
      label: dashboard.decisionLabels.fallback,
      reason: dashboard.defaultDecisionReasons.fallback,
      confidence: normalized,
    };
  }

  if (normalized >= 0.75 && !hasRiskySlots) {
    return {
      label: dashboard.decisionLabels.ready,
      reason: dashboard.defaultDecisionReasons.ready,
      confidence: normalized,
    };
  }

  if (normalized >= 0.5) {
    return {
      label: dashboard.decisionLabels.review,
      reason: dashboard.defaultDecisionReasons.review,
      confidence: normalized,
    };
  }

  return {
    label: dashboard.decisionLabels.verify,
    reason: dashboard.defaultDecisionReasons.verify,
    confidence: normalized,
  };
}
