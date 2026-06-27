import type { ProductDashboardConfig } from "../types/product";

function getResumeGuidance() {
  return `Fast mode for resumes. Return compact JSON only.
- Use the document language.
- Use only the document text.
- Max 4 slots.
- Max 3 bullets per slot.
- Each bullet <= 100 chars.
- Max 3 factors.
- Max 3 missing_factors.
- Max 2 items per improvements group.
- Decision reason <= 120 chars.
- confidence_reason <= 100 chars.
- Do not include title, priority, shouldRender, evidence, document_completeness, quality, document_type, document_title.
- Return empty arrays when a field is unsupported.`;
}

export const userPromptTemplate = ({
  docType,
  expertLabel,
  schema,
  text,
  dashboard,
}: {
  docType: string;
  expertLabel: string;
  schema: object;
  text: string;
  dashboard: ProductDashboardConfig;
}) => {
  if (docType === "resume") {
    return `You are InsightFlow Fast Mode.
Document type: resume
Audience: hiring reviewers
Return only single valid JSON.
Schema:
{
  "decision": {
    "label": "string",
    "reason": "string",
    "factors": ["string"],
    "missing_factors": ["string"]
  },
  "slots": [
    {
      "type": "string",
      "content": "string|string[]|object",
      "confidence": 0.0,
      "confidence_reason": "string"
    }
  ],
  "improvements": {
    "quick_wins": ["string"],
    "recommended": ["string"],
    "high_impact": ["string"]
  }
}
${getResumeGuidance()}
TEXT:
${text}`;
  }

  const allowedTypes = dashboard.slots.map((slot) => slot.type);
  const slotTitles = dashboard.slots
    .map((slot) => `- ${slot.type}: ${slot.title}`)
    .join("\n");
  const decisionOptions = Object.values(dashboard.decisionLabels)
    .map((option) => `- ${option}`)
    .join("\n");

  return `You are InsightFlow, a document decision engine.
Document type: ${docType}
Selected expert: ${expertLabel}
Audience: ${dashboard.audience ?? "reviewers"}
Return a single valid JSON object.
Use the document language.
Use only the document text.
Keep the response compact.
Allowed slot types: ${allowedTypes.join(", ")}
Slot titles:
${slotTitles}
Decision labels:
${decisionOptions}
Rules:
- Max 4 slots.
- Max 3 bullets per slot.
- Max 3 factors.
- Max 3 missing_factors.
- Max 2 items per improvements group.
- Each bullet <= 100 chars.
- Decision reason <= 120 chars.
- confidence_reason <= 100 chars.
Schema:
${JSON.stringify(schema, null, 2)}
TEXT:
${text}`;
};
