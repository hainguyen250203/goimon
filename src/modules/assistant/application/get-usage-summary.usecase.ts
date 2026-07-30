import type { AssistantRepository, UsageSummaryRow } from "../domain/assistant.repository";

export type UsageSummaryItem = UsageSummaryRow & { estimatedCostUsd: number };

// USD / 1.000.000 token — giá tham khảo lúc viết tính năng này, cần kiểm tra
// lại giá thật tại https://openai.com/api/pricing trước khi dùng để báo cáo
// chi phí chính thức, vì OpenAI có thể đổi giá.
const PRICING_USD_PER_1M_TOKENS = { input: 2.0, output: 8.0 };

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * PRICING_USD_PER_1M_TOKENS.input +
    (outputTokens / 1_000_000) * PRICING_USD_PER_1M_TOKENS.output
  );
}

export async function getUsageSummary(
  repository: AssistantRepository,
  userId: string,
): Promise<UsageSummaryItem[]> {
  const rows = await repository.getUsageSummary(userId);
  return rows.map((row) => ({
    ...row,
    estimatedCostUsd: estimateCostUsd(row.inputTokens, row.outputTokens),
  }));
}
