import type { ExpertConfig } from "../types/expert";

export const requirements: ExpertConfig = {
  id: "requirements",
  label: "Requirements / Specifications Expert",
  role: "Requirements Analyst",
  mission: "Extract goals, acceptance criteria, dependencies, and risks from requirements documents.",
  objectives: [
    "Summarize project scope",
    "Identify acceptance criteria and dependencies",
    "Highlight risks and gaps",
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
    category: "Requirements",
    confidenceThreshold: 0.8,
  },
};
