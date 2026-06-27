import type { ExpertConfig } from "../types/expert";
import type { ProductDashboardConfig } from "../types/product";
import { userPromptTemplate } from "./templates";
import { systemPrompt } from "./system";

export function buildPrompt({
  expert,
  dashboard,
  docType,
  language,
  text,
}: {
  expert: ExpertConfig;
  dashboard: ProductDashboardConfig;
  docType: string;
  language: string;
  text: string;
}) {
  const system = `${systemPrompt}\nDocument language: ${language}`;
  const user = userPromptTemplate({
    docType,
    expertLabel: expert.label,
    schema: expert.schema,
    text,
    dashboard,
  });

  return {
    system,
    user,
    expert,
    schema: expert.schema,
  };
}
