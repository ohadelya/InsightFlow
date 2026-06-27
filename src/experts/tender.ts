import type { ExpertConfig } from "../types/expert";

export const tender: ExpertConfig = {
  id: "tender",
  label: "Tender/RFP Expert",
  role: "Procurement Analyst",
  mission: "Extract procurement requirements, risks, deadlines, and mandatory conditions from tender documents.",
  objectives: [
    "Summarize tender scope",
    "Identify key risks and deadlines",
    "Capture mandatory requirements and action items",
  ],
  schema: {
    summary: "string",
    slots: [
      {
        type: "string",
        title: "string",
        content: "string|null",
        priority: "number",
        confidence: "number",
        shouldRender: "boolean",
      },
    ],
  },
  priorityFields: ["summary", "slots"],
  documentMetadata: {
    supportedLanguages: ["he", "en"],
    version: "1.0",
    category: "Procurement",
    confidenceThreshold: 0.8,
  },
};
