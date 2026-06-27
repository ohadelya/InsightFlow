import React from "react";
import type { ProductResponse } from "../../types/product";

export function ImprovementCard({ data }: { data: ProductResponse }) {
  if (!data.improvements) return null;

  const { quick_wins, recommended, high_impact } = data.improvements;
  const lang = data.language;

  const hasQuickWins = Array.isArray(quick_wins) && quick_wins.length > 0;
  const hasRecommended = Array.isArray(recommended) && recommended.length > 0;
  const hasHighImpact = Array.isArray(high_impact) && high_impact.length > 0;

  if (!hasQuickWins && !hasRecommended && !hasHighImpact) return null;

  return (
    <div style={gridStyle}>
      <div className="print-card" style={{ ...cardStyle, borderTop: `4px solid #10b981` }}>
        <h3 style={cardTitle}>
          {lang === "Hebrew" ? "איך ניתן לחזק את המסמך" : "How to Strengthen This Document"}
        </h3>
        
        <div style={cardContent}>
          {hasQuickWins && (
            <div style={{ marginBottom: (hasRecommended || hasHighImpact) ? 18 : 0 }}>
              <div style={sectionHeaderStyle}>
                {lang === "Hebrew" ? "ניצחונות מהירים (Quick Wins):" : "Quick Wins:"}
              </div>
              <ul style={factorList}>
                {quick_wins.map((f, i) => (
                  <li key={i} style={factorItem}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {hasRecommended && (
            <div style={{ marginBottom: hasHighImpact ? 18 : 0 }}>
              <div style={sectionHeaderStyle}>
                {lang === "Hebrew" ? "שיפורים מומלצים:" : "Recommended Improvements:"}
              </div>
              <ul style={factorList}>
                {recommended.map((f, i) => (
                  <li key={i} style={factorItem}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {hasHighImpact && (
            <div>
              <div style={sectionHeaderStyle}>
                {lang === "Hebrew" ? "שיפורים בעלי השפעה גבוהה:" : "High Impact Improvements:"}
              </div>
              <ul style={factorList}>
                {high_impact.map((f, i) => (
                  <li key={i} style={factorItem}>{f}</li>
                ))}
              </ul>
            </div>
          )}
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

const cardContent: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
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
