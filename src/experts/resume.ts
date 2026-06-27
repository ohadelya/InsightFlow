import type { ExpertConfig } from "../types/expert";

export const resume: ExpertConfig = {
  id: "resume",
  label: "Resume Expert",
  role: "Resume Analyst",
  mission: "Extract candidate details, career history, and skills from resumes.",
  objectives: [
    "Summarize professional experience",
    "Identify core skills and qualifications",
    "Highlight missing resume details",
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
    category: "HR",
    confidenceThreshold: 0.8,
  },
};
