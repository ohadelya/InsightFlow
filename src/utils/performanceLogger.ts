export const PERFORMANCE_BUDGETS = {
  extraction: 250,
  qualityCheck: 50,
  classification: 300,
  aiGeneration: 3500,
  jsonParse: 20,
  total: 5000,
} as const;

const MODEL_PRICING: Record<string, { inputPer1kTokensUsd: number | null; outputPer1kTokensUsd: number | null }> = {
  "gpt-4o-mini": {
    inputPer1kTokensUsd: null,
    outputPer1kTokensUsd: null,
  },
};

export function startStageTimer(stageName: string, budgetMs: number) {
  const startedAt = Date.now();

  return {
    stop() {
      const durationMs = Date.now() - startedAt;
      return { durationMs };
    },
  };
}

export function estimateTokenCount(text: string | null | undefined) {
  if (typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function estimateCostUsd({ model, inputTokens, outputTokens }: { model: string; inputTokens: number; outputTokens: number }) {
  const pricing = MODEL_PRICING[model];
  if (!pricing || pricing.inputPer1kTokensUsd == null || pricing.outputPer1kTokensUsd == null) {
    return null;
  }

  const inputCost = (inputTokens / 1000) * pricing.inputPer1kTokensUsd;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1kTokensUsd;
  return inputCost + outputCost;
}

export function logBudgetWarning(stageName: string, durationMs: number, budgetMs: number) {
  console.warn(`[PERF WARNING] ${stageName} exceeded budget`);
}

export function logBudgetWarnings(warnings: string[]) {
  warnings.forEach((warning) => console.warn(warning));
}

export function formatPerformanceSummary(metrics: Record<string, unknown>) {
  const costValue = metrics.estimatedCost == null ? "unavailable" : `$${Number(metrics.estimatedCost).toFixed(6)}`;
  const budgetWarnings = Array.isArray(metrics.budgetWarnings) && metrics.budgetWarnings.length > 0
    ? metrics.budgetWarnings.join("; ")
    : "none";

  return [
    "[InsightFlow Performance]",
    `documentType:${metrics.documentType ?? "unknown"}`,
    `classificationSource:${metrics.classificationSource ?? "unknown"}`,
    `cacheHit:${metrics.cacheHit ?? "unknown"}`,
    `model:${metrics.model ?? "unknown"}`,
    `promptChars:${metrics.promptChars ?? 0}`,
    `inputTokens:${metrics.inputTokens ?? 0}(${metrics.inputTokenSource ?? "estimated"})`,
    `outputTokens:${metrics.outputTokens ?? 0}(${metrics.outputTokenSource ?? "estimated"})`,
    `totalTokens:${metrics.totalTokens ?? 0}(${metrics.totalTokenSource ?? "estimated"})`,
    `estimatedCost:${costValue}`,
    `extractionMs:${metrics.extractionMs ?? 0}`,
    `qualityCheckMs:${metrics.qualityCheckMs ?? 0}`,
    `classificationMs:${metrics.classificationMs ?? 0}`,
    `aiGenerationMs:${metrics.aiGenerationMs ?? 0}`,
    `jsonParseMs:${metrics.jsonParseMs ?? 0}`,
    `totalMs:${metrics.totalMs ?? 0}`,
    `budgetWarnings:${budgetWarnings}`,
  ].join(" ");
}
