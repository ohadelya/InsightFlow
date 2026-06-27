import React from "react";
import { getSlotPriorityLabel, getSlotPriorityTier } from "../../product/displayHelpers";

const priorityBadgeStyles: Record<string, React.CSSProperties> = {
  "very-important": {
    background: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  important: {
    background: "rgba(245, 158, 11, 0.15)",
    color: "#fbbf24",
    border: "1px solid rgba(245, 158, 11, 0.3)",
  },
  supporting: {
    background: "rgba(100, 116, 139, 0.15)",
    color: "#94a3b8",
    border: "1px solid rgba(100, 116, 139, 0.3)",
  },
};

const badgeBaseStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
};

export function PriorityBadge({ priority, lang }: { priority: number; lang?: "English" | "Hebrew" }) {
  const tier = getSlotPriorityTier(priority);
  const style = priorityBadgeStyles[tier] || priorityBadgeStyles.supporting;

  return (
    <span style={{ ...badgeBaseStyle, ...style }}>
      {getSlotPriorityLabel(priority, lang)}
    </span>
  );
}
