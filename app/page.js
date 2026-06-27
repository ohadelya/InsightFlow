"use client";

import { useEffect, useState } from "react";
import {
  getDocumentTypeLabel,
  shouldHideByConfidence,
  getConfidenceHelperText,
  getLanguageDirection,
} from "../src/product/displayHelpers";
import {
  DecisionHeader,
  SlotCard,
} from "../src/components/dashboard";

// ---------------------------------------------------------------------------
// Loading step configuration — 3 named phases
// ---------------------------------------------------------------------------

const LOADING_STEPS = [
  { label: "Reading document", progress: 10 },
  { label: "Detecting document type", progress: 40 },
  { label: "Building decision dashboard", progress: 100 },
];

function getExtractionFailureMessage() {
  if (typeof navigator !== "undefined" && String(navigator.language || "").toLowerCase().startsWith("he")) {
    return "לא הצלחנו לקרוא את קובץ ה-PDF. נסה להעלות קובץ PDF עם טקסט שניתן לסימון, או המר את הקובץ מחדש ל-PDF.";
  }

  return "We could not read this PDF. Please upload a text-based PDF or re-export the file as PDF.";
}

function getApiErrorMessage(response) {
  if (response?.stage === "extraction") {
    return getExtractionFailureMessage();
  }

  if (typeof response?.error === "string" && response.error.trim()) {
    return response.error;
  }

  if (typeof response?.message === "string" && response.message.trim()) {
    return response.message;
  }

  return "Unable to parse API response.";
}

// removed badge styles since they are handled in components

export default function Home() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [downloadType, setDownloadType] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState(0);
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(true);

  useEffect(() => {
    return () => {};
  }, []);

  useEffect(() => {
    setIsAdditionalOpen(true);
  }, [data]);

  const currentStepLabel =
    loading
      ? LOADING_STEPS[Math.min(progressStep, LOADING_STEPS.length - 1)].label
      : progress === 100
      ? "Analysis complete"
      : "Ready to analyze";

  const upload = async () => {
    if (!file) {
      setError("Please select a PDF file before analyzing.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setData(null);
    setError(null);

    // Step 1 — upload begins
    setProgressStep(0);
    setProgress(LOADING_STEPS[0].progress);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      // Step 2 — server has finished extraction + classification
      setProgressStep(1);
      setProgress(LOADING_STEPS[1].progress);

      const json = await res.json();

      if (!res.ok) {
        setError(getApiErrorMessage(json));
        return;
      }

      // Step 3 — AI analysis complete
      setProgressStep(2);
      setProgress(LOADING_STEPS[2].progress);

      const payload = json?.result ?? json;
      setData(payload);
    } catch (err) {
      setError(err?.message || "Network error. Please try again.");
      setProgress(0);
      setProgressStep(0);
    } finally {
      setLoading(false);
    }
  };

  const serializeText = (payload) => {
    const lines = [];
    const typeLabel = getDocumentTypeLabel(payload.document_type, payload.language);
    lines.push(`Document Type: ${typeLabel}`);
    lines.push(`Recommendation: ${payload.decision?.label || "n/a"}`);
    lines.push(
      `Decision Confidence: ${payload.decision?.confidence != null ? `${Math.round(payload.decision.confidence * 100)}%` : "n/a"}`,
    );
    if (payload.decision?.reason) {
      lines.push(`Reason: ${payload.decision.reason}`);
    }
    if (Array.isArray(payload.decision?.factors) && payload.decision.factors.length) {
      lines.push("\nKey Factors:");
      payload.decision.factors.forEach((f) => lines.push(`- ${f}`));
    }
    if (Array.isArray(payload.decision?.missing_factors) && payload.decision.missing_factors.length) {
      lines.push("\nMissing Information:");
      payload.decision.missing_factors.forEach((f) => lines.push(`- ${f}`));
    }
    lines.push(`Language: ${payload.language || "English"}`);
    if (payload.document_title) {
      lines.push(`Title: ${payload.document_title}`);
    }
    if (payload.quality?.warnings?.length) {
      lines.push("\nWarnings:");
      payload.quality.warnings.forEach((warning) => lines.push(`- ${warning}`));
    }

    if (payload.document_completeness) {
      lines.push("\nDocument Completeness:");
      if (payload.document_completeness.found?.length) {
        lines.push("Found: " + payload.document_completeness.found.join(", "));
      }
      if (payload.document_completeness.missing?.length) {
        lines.push("Missing: " + payload.document_completeness.missing.join(", "));
      }
    }

    const slots = Array.isArray(payload.slots) ? payload.slots : [];
    if (slots.length) {
      lines.push("\nSlots:");
      slots.forEach((slot) => {
        lines.push(
          `- ${slot.title} (${slot.type}, confidence ${Math.round(slot.confidence * 100)}%)`,
        );
        if (slot.confidence_reason) lines.push(`  Confidence note: ${slot.confidence_reason}`);
        if (slot.evidence) {
          lines.push(`  Evidence: ${typeof slot.evidence === 'string' ? slot.evidence : slot.evidence.reason}`);
        }
        if (typeof slot.content === "string") {
          lines.push(`  ${slot.content}`);
        } else {
          lines.push(`  ${JSON.stringify(slot.content, null, 2)}`);
        }
      });
    }

    return lines.join("\n");
  };

  const printReport = () => {
    window.print();
  };

  const downloadReport = async () => {
    if (!data) return;

    const fileName = `InsightFlow-report-${Date.now()}`;

    if (downloadType === "pdf") {
      try {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        const text = serializeText(data);
        const wrapped = doc.splitTextToSize(text, 180);
        doc.text(wrapped, 14, 14);
        doc.save(`${fileName}.pdf`);
        return;
      } catch (e) {
        console.warn("PDF export failed, falling back to TXT:", e);
        alert("PDF export is unavailable in this build. The file will download as TXT instead.");
      }
    }

    const content = downloadType === "txt" ? serializeText(data) : JSON.stringify(data, null, 2);
    const contentType = downloadType === "txt" ? "text/plain" : "application/json";
    const extension = downloadType === "txt" ? "txt" : "json";
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const languageDirection = getLanguageDirection(data?.language);

  // Visible slots — client-side filter mirrors server-side rule
  const normalizedSlots = Array.isArray(data?.slots)
    ? data.slots.filter((slot) => {
        if (slot?.shouldRender === false) return false;
        const isExempt = slot.type.includes("warning") || slot.type.includes("gaps");
        return !shouldHideByConfidence(slot.confidence) || isExempt;
      })
    : [];

  const additionalDetailTypes = new Set([
    "languages",
    "military_service",
    "education",
    "certifications",
    "key_projects",
    "achievements",
  ]);

  const decisionSummarySlot = normalizedSlots.find((slot) => slot.type === "decision_summary");
  const completenessSlot = normalizedSlots.find((slot) => slot.type === "document_completeness");

  const primaryInsightSlots = normalizedSlots.filter((slot) => {
    if (slot.type === "decision_summary") return false;
    if (slot.type === "document_completeness") return false;
    if (additionalDetailTypes.has(slot.type)) return false;
    return true;
  });

  const additionalDetailSlots = normalizedSlots.filter((slot) => additionalDetailTypes.has(slot.type));

  const lang = data?.language;

  return (
    <div style={{ ...styles.page, direction: languageDirection }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes stepPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-card { border: none !important; box-shadow: none !important; }
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>InsightFlow</h1>
          <p style={styles.subtitle}>
            Upload a PDF and receive a categorized, structured report for resumes, tenders, contracts, or requirements.
          </p>
        </div>

        <div style={styles.uploadBox}>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button
            onClick={upload}
            disabled={loading || !file}
            style={{
              ...styles.button,
              opacity: loading || !file ? 0.55 : 1,
              cursor: loading || !file ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Analyzing..." : "Analyze Document"}
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Progress — 3 named phases */}
        <div style={styles.progressWrapper}>
          <div style={styles.progressLabel}>{currentStepLabel}</div>
          <div style={styles.progressBarBackground}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
          </div>
          {loading && (
            <div style={styles.stepsRow}>
              {LOADING_STEPS.map((step, idx) => (
                <div
                  key={step.label}
                  style={{
                    ...styles.stepItem,
                    color: idx < progressStep ? "#34d399" : idx === progressStep ? "#818cf8" : "#475569",
                    animation: idx === progressStep ? "stepPulse 1.2s ease-in-out infinite" : "none",
                  }}
                >
                  <span style={{ marginRight: 6 }}>
                    {idx < progressStep ? "✓" : idx === progressStep ? "●" : "○"}
                  </span>
                  {step.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div style={styles.loadingBox}>
            <div style={styles.loader} />
            <p>Analyzing document and extracting insights...</p>
          </div>
        )}

        {data && (
          <>
            {/* Top area */}
            <DecisionHeader data={data} />

            {/* Document title */}
            {data.document_title ? (
              <div style={styles.grid}>
                <div className="print-card" style={{ ...styles.card, borderTop: `4px solid #3b82f6` }}>
                  <h3 style={styles.cardTitle}>{lang === "Hebrew" ? "כותרת מסמך" : "Document Title"}</h3>
                  <p style={styles.textBlock}>{data.document_title}</p>
                  {data.candidate_name ? (
                    <p style={{ ...styles.textBlock, marginTop: 8, color: "#93c5fd" }}>
                      {lang === "Hebrew" ? "מועמד: " : "Candidate: "}{data.candidate_name}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Second row: recommendation + compact completeness */}
            {(decisionSummarySlot || completenessSlot) && (
              <div style={styles.secondaryGrid}>
                {decisionSummarySlot ? <SlotCard slot={decisionSummarySlot} lang={lang} /> : <div />}
                {completenessSlot ? <SlotCard slot={completenessSlot} lang={lang} /> : <div />}
              </div>
            )}

            {/* Confidence helper text — shown once above slot grid */}
            {normalizedSlots.length > 0 && (
              <div style={styles.confidenceHelperBanner}>
                <span style={styles.confidenceHelperIcon}>ℹ</span>
                {getConfidenceHelperText(lang)}
              </div>
            )}

            {/* Main insights */}
            {primaryInsightSlots.length > 0 && (
              <div style={styles.mainGrid}>
                {primaryInsightSlots.map((slot) => (
                  <SlotCard key={`${slot.type}-${slot.priority}-${slot.title}`} slot={slot} lang={lang} />
                ))}
              </div>
            )}

            {/* Lower priority factual details */}
            {additionalDetailSlots.length > 0 && (
              <div style={styles.additionalSection}>
                <button
                  type="button"
                  onClick={() => setIsAdditionalOpen((prev) => !prev)}
                  style={styles.additionalToggle}
                >
                  {lang === "Hebrew" ? "פרטים נוספים שזוהו בקורות החיים" : "Additional Resume Details"}
                  <span style={styles.toggleArrow}>{isAdditionalOpen ? "▲" : "▼"}</span>
                </button>
                {isAdditionalOpen && (
                  <div style={styles.mainGrid}>
                    {additionalDetailSlots.map((slot) => (
                      <SlotCard key={`${slot.type}-${slot.priority}-${slot.title}`} slot={slot} lang={lang} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {normalizedSlots.length === 0 && (
              <div style={styles.grid}>
                <div className="print-card" style={{ ...styles.card, borderTop: `4px solid #64748b` }}>
                  <h3 style={styles.cardTitle}>{lang === "Hebrew" ? "לא זוהו מקטעים להצגה." : "No report sections were identified."}</h3>
                  <p style={styles.placeholder}>
                    {lang === "Hebrew"
                      ? "לא זוהו מקטעים להצגה."
                      : "No report sections were identified."}
                  </p>
                </div>
              </div>
            )}

            <div style={styles.downloadFooter}>
              <button onClick={printReport} style={styles.printButton} className="no-print">
                {lang === "Hebrew" ? "הדפס דוח" : "Print Report"}
              </button>
              <div style={styles.downloadOptions}>
                <label style={styles.downloadLabel} htmlFor="downloadType">
                  Export as
                </label>
                <select
                  id="downloadType"
                  value={downloadType}
                  onChange={(e) => setDownloadType(e.target.value)}
                  style={styles.select}
                >
                  <option value="pdf">PDF</option>
                  <option value="txt">TXT</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <button onClick={downloadReport} style={styles.downloadButton}>
                Download Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Card removed to use new dashboard components

const styles = {
  page: {
    fontFamily: "Inter, Arial, sans-serif",
    background: "#0b0f19",
    color: "#e5e7eb",
    minHeight: "100vh",
    padding: 40,
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 40,
    marginBottom: 8,
  },
  subtitle: {
    color: "#9ca3af",
    maxWidth: 760,
    lineHeight: 1.7,
  },
  uploadBox: {
    display: "flex",
    gap: 12,
    marginBottom: 30,
    alignItems: "center",
    flexWrap: "wrap",
  },
  button: {
    padding: "12px 20px",
    background: "#4f46e5",
    border: "none",
    borderRadius: 10,
    color: "white",
    cursor: "pointer",
    transition: "background 0.2s ease",
  },
  downloadButton: {
    padding: "12px 20px",
    background: "#10b981",
    border: "none",
    borderRadius: 10,
    color: "white",
    cursor: "pointer",
    width: "100%",
  },
  errorBox: {
    marginTop: 20,
    padding: 16,
    background: "#7f1d1d",
    borderRadius: 12,
    color: "#fee2e2",
  },
  loadingBox: {
    marginTop: 20,
    padding: 20,
    background: "#111827",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  loader: {
    width: 18,
    height: 18,
    border: "2px solid #4f46e5",
    borderTop: "2px solid transparent",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  metaRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  metaCard: {
    background: "#111827",
    borderRadius: 14,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  metaLabel: {
    color: "#9ca3af",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
    marginTop: 30,
  },
  secondaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
    marginTop: 20,
    alignItems: "stretch",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
    marginTop: 20,
    alignItems: "stretch",
  },
  additionalSection: {
    marginTop: 24,
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 14,
    background: "#0f172a",
  },
  additionalToggle: {
    width: "100%",
    background: "transparent",
    color: "#e2e8f0",
    border: "none",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 2px",
  },
  toggleArrow: {
    color: "#94a3b8",
    fontSize: 12,
  },
  card: {
    background: "#111827",
    padding: 18,
    borderRadius: 16,
  },
  cardTitle: {
    marginBottom: 12,
    fontSize: 18,
  },
  cardContent: {
    fontSize: 14,
    lineHeight: 1.7,
  },
  slotMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  slotLabel: {
    color: "#94a3b8",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: 4,
  },
  priorityBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.04em",
  },
  confidenceBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid",
    background: "transparent",
  },
  confidenceReason: {
    margin: "0 0 10px 0",
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    lineHeight: 1.6,
  },
  confidenceHelperBanner: {
    marginTop: 24,
    padding: "10px 14px",
    background: "rgba(99, 102, 241, 0.08)",
    borderRadius: 10,
    border: "1px solid rgba(99, 102, 241, 0.2)",
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 1.6,
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  confidenceHelperIcon: {
    color: "#6366f1",
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1,
  },
  placeholder: {
    opacity: 0.7,
    fontStyle: "italic",
  },
  downloadFooter: {
    marginTop: 30,
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  downloadOptions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  downloadLabel: {
    color: "#9ca3af",
  },
  select: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#e5e7eb",
  },
  printButton: {
    padding: "12px 20px",
    background: "#2563eb",
    border: "none",
    borderRadius: 10,
    color: "white",
    cursor: "pointer",
    width: "100%",
  },
  textBlock: {
    margin: 0,
    lineHeight: 1.8,
  },
  progressWrapper: {
    marginBottom: 18,
  },
  progressLabel: {
    color: "#cbd5e1",
    marginBottom: 8,
    fontSize: 14,
  },
  progressBarBackground: {
    width: "100%",
    background: "#0f172a",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    background: "#34d399",
    transition: "width 500ms ease",
  },
  stepsRow: {
    marginTop: 10,
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
  },
  stepItem: {
    fontSize: 13,
    display: "flex",
    alignItems: "center",
  },
  // Completeness card
  completenessGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  completenessRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  checkmarkFound: {
    color: "#34d399",
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
    width: 18,
  },
  checkmarkMissing: {
    color: "#f87171",
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
    width: 18,
  },
  completenessSection: {
    fontSize: 14,
    lineHeight: 1.5,
  },
  completenessReason: {
    marginLeft: 28,
    marginTop: 2,
    marginBottom: 2,
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  // Decision factors
  factorList: {
    paddingLeft: 18,
    margin: 0,
  },
  factorItem: {
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 1.6,
    color: "#e2e8f0",
  },
  missingFactorHeader: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 8,
    fontStyle: "italic",
  },
};
