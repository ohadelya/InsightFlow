import React from "react";
import type { ProductDecision } from "../../types/product";

export function RecommendationCard({ decision, lang }: { decision: ProductDecision; lang?: "English" | "Hebrew" }) {
  if (!decision) return null;

  const hasFactors = Array.isArray(decision.factors) && decision.factors.length > 0;
  const hasMissing = Array.isArray(decision.missing_factors) && decision.missing_factors.length > 0;
  const hasConfidenceReasons = Array.isArray(decision.confidence_reasons) && decision.confidence_reasons.length > 0;

  return (
    <div style={gridStyle}>
      {decision.reason && (
        <Card title={lang === "Hebrew" ? "הבהרה" : "Decision Rationale"} color="#2563eb">
          <p style={textBlock}>{decision.reason}</p>
        </Card>
      )}

      {(hasFactors || hasMissing || hasConfidenceReasons) && (
        <Card title={lang === "Hebrew" ? "מדוע ניתנה המלצה זו?" : "Why this recommendation?"} color="#7c3aed">
          
          {hasFactors && (
            <div style={{ marginBottom: (hasMissing || hasConfidenceReasons) ? 18 : 0 }}>
              <div style={sectionHeaderStyle}>
                {lang === "Hebrew" ? "גורמים מרכזיים:" : "Key Factors:"}
              </div>
              <ul style={factorList}>
                {decision.factors!.map((f, i) => (
                  <li key={i} style={factorItem}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {hasMissing && (
            <div style={{ marginBottom: hasConfidenceReasons ? 18 : 0 }}>
              <div style={sectionHeaderStyle}>
                {lang === "Hebrew" ? "מידע חסר (השפיע על ההחלטה):" : "Missing information (impacted recommendation):"}
              </div>
              <ul style={factorList}>
                {decision.missing_factors!.map((f, i) => (
                  <li key={i} style={{ ...factorItem, color: "#94a3b8" }}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {hasConfidenceReasons && (
            <div>
              <div style={sectionHeaderStyle}>
                {lang === "Hebrew" ? "למה ביטחון ההחלטה הוא כזה:" : "Why confidence is at this level:"}
              </div>
              <ul style={factorList}>
                {decision.confidence_reasons!.map((f, i) => (
                  <li key={i} style={{ ...factorItem, color: "#94a3b8" }}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Card({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="print-card" style={{ ...cardStyle, borderTop: `4px solid ${color}` }}>
      <h3 style={cardTitle}>{title}</h3>
      <div style={cardContent}>{children}</div>
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

const cardContent: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
};

const textBlock: React.CSSProperties = {
  margin: 0,
  lineHeight: 1.8,
};

const sectionHeaderStyle: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: 6,
  color: "#cbd5e1",
};

const factorList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
};

const factorItem: React.CSSProperties = {
  marginBottom: 6,
};
