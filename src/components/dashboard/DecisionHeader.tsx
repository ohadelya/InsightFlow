import React from "react";
import { getDecisionLabel, getDocumentTypeLabel } from "../../product/displayHelpers";
import type { ProductResponse } from "../../types/product";

export function DecisionHeader({ data }: { data: ProductResponse }) {
  const lang = data.language;
  const typeLabel = getDocumentTypeLabel(data.document_type, lang);
  const statusLabel = getDecisionLabel(data.decision?.label, lang);
  const statusColor = data.document_type === "generic" ? "#f59e0b" : "#34d399";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
        marginTop: 20,
      }}
    >
      <div style={cardStyle}>
        <span style={labelStyle}>{lang === "Hebrew" ? "סוג מסמך" : "Document Type"}</span>
        <strong>{typeLabel}</strong>
      </div>
      <div style={cardStyle}>
        <span style={labelStyle}>{lang === "Hebrew" ? "ביטחון סיווג" : "Classification Confidence"}</span>
        <strong>
          {data.quality?.classification_confidence != null
            ? `${Math.round(data.quality.classification_confidence * 100)}%`
            : "n/a"}
        </strong>
      </div>
      <div style={{ ...cardStyle, borderTop: `4px solid ${statusColor}` }}>
        <span style={labelStyle}>{lang === "Hebrew" ? "המלצה" : "Recommendation"}</span>
        <strong>{statusLabel}</strong>
      </div>
      {data.candidate_name ? (
        <div style={cardStyle}>
          <span style={labelStyle}>{lang === "Hebrew" ? "מועמד" : "Candidate"}</span>
          <strong>{data.candidate_name}</strong>
        </div>
      ) : null}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#111827",
  borderRadius: 14,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};
