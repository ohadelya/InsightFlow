import React from "react";
import type { ProductResponse } from "../../types/product";

export function CompletenessCard({ data }: { data: ProductResponse }) {
  if (!data.document_completeness) return null;

  const { found, missing, missing_reasons } = data.document_completeness;
  const lang = data.language;

  const hasFound = Array.isArray(found) && found.length > 0;
  const hasMissing = Array.isArray(missing) && missing.length > 0;

  if (!hasFound && !hasMissing) return null;

  return (
    <div style={gridStyle}>
      <div className="print-card" style={{ ...cardStyle, borderTop: `4px solid #6366f1` }}>
        <h3 style={cardTitle}>
          {lang === "Hebrew" ? "שלמות המסמך" : "Document Completeness"}
        </h3>
        
        <div style={completenessGrid}>
          {hasFound && found.map((section) => (
            <div key={`found-${section}`} style={completenessRow}>
              <span style={checkmarkFound}>✓</span>
              <span style={completenessSection}>{section}</span>
            </div>
          ))}

          {hasMissing && missing.map((section) => {
            const reason = missing_reasons?.[section];
            return (
              <div key={`missing-${section}`} style={{ marginBottom: 10 }}>
                <div style={completenessRow}>
                  <span style={checkmarkMissing}>✗</span>
                  <span style={{ ...completenessSection, color: "#f87171" }}>
                    {section}
                  </span>
                </div>
                {reason && (
                  <div style={completenessReason}>
                    {lang === "Hebrew" ? "מדוע זה חשוב: " : "Why it matters: "}
                    {reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 16,
  marginTop: 30,
};

const cardStyle: React.CSSProperties = {
  background: "#111827",
  padding: 18,
  borderRadius: 16,
};

const cardTitle: React.CSSProperties = {
  marginBottom: 12,
  fontSize: 18,
};

const completenessGrid: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const completenessRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const completenessSection: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
};

const completenessReason: React.CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
  marginLeft: 26,
  marginTop: 4,
};

const checkmarkFound: React.CSSProperties = {
  color: "#34d399",
  fontWeight: 700,
  fontSize: 16,
};

const checkmarkMissing: React.CSSProperties = {
  color: "#f87171",
  fontWeight: 700,
  fontSize: 16,
};
