import type { ExpertConfig } from "../types/expert";

export const generic: ExpertConfig = {
  id: "generic",
  label: "InsightFlow General Expert",
  role: "General Document Analyst",
  mission: "Extract the most important points, risks, and recommendations from general documents.",
  objectives: [
    "Summarize key document points",
    "Identify potential risks",
    "Provide practical recommendations",
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
    category: "General",
    confidenceThreshold: 0.8,
  },
};
