import type { ExpertConfig } from "../types/expert";

export const contract: ExpertConfig = {
  id: "contract",
  label: "Contract Expert",
  role: "Contract Analyst",
  mission: "Extract contract obligations, clauses, risks, and deadlines from legal agreements.",
  objectives: [
    "Summarize contract intent",
    "Identify major obligations and risk areas",
    "Flag missing terms and deadlines",
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
    category: "Legal",
    confidenceThreshold: 0.8,
  },
};
