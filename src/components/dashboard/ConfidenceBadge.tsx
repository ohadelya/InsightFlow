import React from "react";
import { getConfidenceLabel, getConfidenceTier } from "../../product/displayHelpers";

const confidenceBadgeColors: Record<string, string> = {
  high: "#34d399",
  moderate: "#fbbf24",
  low: "#f87171",
  hidden: "#64748b",
};

export function ConfidenceBadge({ confidence, lang }: { confidence: number; lang?: "English" | "Hebrew" }) {
  const confTier = getConfidenceTier(confidence);
  const confColor = confidenceBadgeColors[confTier] || "#64748b";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: "1px solid",
        borderColor: confColor,
        color: confColor,
        background: "transparent",
      }}
    >
      {getConfidenceLabel(confidence, lang)}
    </span>
  );
}
