import React from "react";
import type { ProductSlot } from "../../types/product";
import { formatSlotTitle, getConfidenceTier } from "../../product/displayHelpers";
import { PriorityBadge } from "./PriorityBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";

function renderSlotContent(value: unknown): React.ReactNode | string | null {
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <ul style={{ paddingLeft: 18 }}>
        {value.map((item, index) => (
          <li key={index} style={{ marginBottom: 8 }}>
            {renderSlotContent(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return null;
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {entries.map(([groupKey, groupValue]) => (
          <div key={groupKey} style={{ background: "#0f172a", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#93c5fd" }}>{groupKey.replace(/_/g, " ")}</div>
            {renderSlotContent(groupValue)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "string") {
    if (!value.trim()) return null;
    return <p style={{ margin: 0, lineHeight: 1.8 }}>{value}</p>;
  }

  return null;
}

function renderSkillsChipGroups(skills: unknown): React.ReactNode | null {
  if (!skills || typeof skills !== "object") return renderSlotContent(skills) as React.ReactNode | null;
  const groups = Object.entries(skills as Record<string, unknown>).filter(
    ([, items]) => Array.isArray(items) && (items as unknown[]).length > 0,
  );
  if (groups.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {groups.map(([groupKey, items]) => (
        <div key={groupKey} style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: "#93c5fd" }}>{groupKey.replace(/_/g, " ")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(items as string[]).map((item, index) => (
              <span
                key={index}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#1e40af",
                  color: "white",
                  fontSize: 13,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderChipList(items: string[], color: "found" | "missing") {
  const palette = color === "found"
    ? { bg: "rgba(16, 185, 129, 0.18)", border: "rgba(16, 185, 129, 0.45)", text: "#86efac", mark: "✓" }
    : { bg: "rgba(248, 113, 113, 0.18)", border: "rgba(248, 113, 113, 0.45)", text: "#fca5a5", mark: "✗" };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <span
          key={`${color}-${item}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 999,
            border: `1px solid ${palette.border}`,
            background: palette.bg,
            color: palette.text,
            fontSize: 13,
            maxWidth: "100%",
            whiteSpace: "normal",
            wordBreak: "break-word",
          }}
        >
          <strong>{palette.mark}</strong>
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}

function renderCompletenessContent(content: unknown, lang: "English" | "Hebrew" | undefined, expanded: boolean, onToggle: () => void) {
  if (!content || typeof content !== "object") return null;
  const rawFound = (content as Record<string, unknown>).found;
  const rawMissing = (content as Record<string, unknown>).missing;
  const found = Array.isArray(rawFound)
    ? (rawFound.filter((v) => typeof v === "string") as string[])
    : [];
  const missing = Array.isArray(rawMissing)
    ? (rawMissing.filter((v) => typeof v === "string") as string[])
    : [];
  const missingReasons = ((content as Record<string, unknown>).missing_reasons || {}) as Record<string, string>;

  const topReasonPairs = missing
    .map((item) => ({ label: item, reason: missingReasons[item] }))
    .filter((entry) => entry.reason)
    .slice(0, 2);

  const moreMissing = missing.slice(3);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {found.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ color: "#a7f3d0", fontSize: 13 }}>{lang === "Hebrew" ? "נמצא" : "Found"}</strong>
          {renderChipList(found.slice(0, expanded ? found.length : 6), "found")}
        </div>
      )}

      {missing.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ color: "#fecaca", fontSize: 13 }}>{lang === "Hebrew" ? "חסר" : "Missing"}</strong>
          {renderChipList(expanded ? missing : missing.slice(0, 3), "missing")}
        </div>
      )}

      {topReasonPairs.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ color: "#cbd5e1", fontSize: 13 }}>{lang === "Hebrew" ? "למה זה חשוב" : "Why it matters"}</strong>
          {topReasonPairs.map((entry) => (
            <div key={`reason-${entry.label}`} style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
              <strong style={{ color: "#e2e8f0" }}>{entry.label}: </strong>
              {entry.reason}
            </div>
          ))}
        </div>
      )}

      {(moreMissing.length > 0 || found.length > 6) && (
        <button type="button" onClick={onToggle} style={toggleButton}>
          {expanded ? (lang === "Hebrew" ? "הצג פחות" : "Show less") : (lang === "Hebrew" ? "הצג עוד" : "Show more")}
        </button>
      )}
    </div>
  );
}

function renderDecisionSummary(content: unknown, lang: "English" | "Hebrew" | undefined) {
  if (!content || typeof content !== "object") return renderSlotContent(content) as React.ReactNode;
  const rawReason = (content as Record<string, unknown>).reason;
  const rawFactors = (content as Record<string, unknown>).factors;
  const rawMissingFactors = (content as Record<string, unknown>).missing_factors;
  const reason = typeof rawReason === "string" ? rawReason : "";
  const factors = Array.isArray(rawFactors) ? rawFactors : [];
  const missingFactors = Array.isArray(rawMissingFactors) ? rawMissingFactors : [];

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {reason ? <p style={{ margin: 0, lineHeight: 1.7 }}>{reason}</p> : null}
      {factors.length > 0 && (
        <div>
          <strong style={{ color: "#cbd5e1" }}>{lang === "Hebrew" ? "גורמים מרכזיים" : "Key factors"}</strong>
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {factors.map((item, index) => <li key={`factor-${index}`}>{String(item)}</li>)}
          </ul>
        </div>
      )}
      {missingFactors.length > 0 && (
        <div>
          <strong style={{ color: "#cbd5e1" }}>{lang === "Hebrew" ? "מידע חסר" : "Missing information"}</strong>
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {missingFactors.map((item, index) => <li key={`missing-${index}`}>{String(item)}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderImprovements(content: unknown, lang: "English" | "Hebrew" | undefined) {
  if (!content || typeof content !== "object") return renderSlotContent(content) as React.ReactNode;
  const groups = [
    { key: "quick_wins", title: lang === "Hebrew" ? "ניצחונות מהירים" : "Quick wins" },
    { key: "recommended", title: lang === "Hebrew" ? "שיפורים מומלצים" : "Recommended" },
    { key: "high_impact", title: lang === "Hebrew" ? "השפעה גבוהה" : "High impact" },
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {groups.map((group) => {
        const items = Array.isArray((content as Record<string, unknown>)[group.key])
          ? ((content as Record<string, unknown>)[group.key] as unknown[]).filter((v) => typeof v === "string")
          : [];
        if (items.length === 0) return null;
        return (
          <div key={group.key}>
            <strong style={{ color: "#cbd5e1" }}>{group.title}</strong>
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              {items.map((item, index) => <li key={`${group.key}-${index}`}>{String(item)}</li>)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function renderNormalizedSlot(slot: ProductSlot, lang: "English" | "Hebrew" | undefined, expanded: boolean, onToggle: () => void) {
  if (slot.type === "document_completeness") {
    return renderCompletenessContent(slot.content, lang, expanded, onToggle);
  }
  if (slot.type === "decision_summary") {
    return renderDecisionSummary(slot.content, lang);
  }
  if (slot.type === "improvement_actions") {
    return renderImprovements(slot.content, lang);
  }
  if (slot.type === "skills_analysis") {
    return renderSkillsChipGroups(slot.content);
  }
  return renderSlotContent(slot.content);
}

export function SlotCard({ slot, lang }: { slot: ProductSlot; lang?: "English" | "Hebrew" }) {
  const [expanded, setExpanded] = React.useState(false);
  const confTier = getConfidenceTier(slot.confidence);
  const confColor = confTier === "high" ? "#34d399" : confTier === "moderate" ? "#fbbf24" : confTier === "low" ? "#f87171" : "#64748b";

  return (
    <div className="print-card" style={{ ...cardStyle, borderTop: `4px solid ${confColor}` }}>
      <h3 style={cardTitle}>{formatSlotTitle(slot, lang)}</h3>

      <div style={slotMetaRow}>
        <div>
          <span style={slotLabel}>{lang === "Hebrew" ? "עדיפות" : "Priority"}</span>
          <PriorityBadge priority={slot.priority} lang={lang} />
        </div>
        <div>
          <span style={slotLabel}>{lang === "Hebrew" ? "ביטחון" : "Confidence"}</span>
          <ConfidenceBadge confidence={slot.confidence} lang={lang} />
        </div>
      </div>

      {slot.confidence_reason && (
        <p style={confidenceReason}>{slot.confidence_reason}</p>
      )}

      <div style={cardContent}>
        {renderNormalizedSlot(slot, lang, expanded, () => setExpanded((prev) => !prev)) || <p style={placeholder}>{lang === "Hebrew" ? "לא זוהה תוכן רלוונטי." : "No specific content was identified for this section."}</p>}
      </div>

      {/* Lightweight Evidence block */}
      {slot.evidence && (
        <div style={evidenceBox}>
          <div style={evidenceHeader}>{lang === "Hebrew" ? "ראיות:" : "Evidence:"}</div>
          {slot.evidence.source_section && (
            <div style={evidenceSection}>
              {lang === "Hebrew" ? "מדור מזהה: " : "Section: "} 
              <strong>{slot.evidence.source_section}</strong>
            </div>
          )}
          <div style={evidenceReason}>{slot.evidence.reason}</div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#111827",
  padding: 18,
  borderRadius: 16,
  minHeight: 220,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const cardTitle: React.CSSProperties = {
  marginBottom: 12,
  fontSize: 18,
};

const cardContent: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const slotMetaRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 12,
  flexWrap: "wrap",
};

const slotLabel: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  display: "block",
  marginBottom: 4,
};

const confidenceReason: React.CSSProperties = {
  margin: "0 0 10px 0",
  fontSize: 12,
  color: "#64748b",
  fontStyle: "italic",
  lineHeight: 1.6,
};

const placeholder: React.CSSProperties = {
  opacity: 0.7,
  fontStyle: "italic",
};

const evidenceBox: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  background: "rgba(15, 23, 42, 0.6)",
  borderRadius: 8,
  borderLeft: "2px solid #64748b",
};

const evidenceHeader: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#94a3b8",
  marginBottom: 6,
};

const evidenceSection: React.CSSProperties = {
  fontSize: 13,
  color: "#cbd5e1",
  marginBottom: 4,
};

const evidenceReason: React.CSSProperties = {
  fontSize: 13,
  color: "#cbd5e1",
  fontStyle: "italic",
};

const toggleButton: React.CSSProperties = {
  marginTop: 4,
  alignSelf: "flex-start",
  background: "transparent",
  border: "1px solid #334155",
  color: "#cbd5e1",
  borderRadius: 999,
  padding: "5px 10px",
  cursor: "pointer",
  fontSize: 12,
};
