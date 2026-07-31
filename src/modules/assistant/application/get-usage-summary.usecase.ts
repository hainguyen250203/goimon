import type { AssistantRepository, UsageSummaryRow } from "../domain/assistant.repository";

export type UsageSummaryItem = UsageSummaryRow & { estimatedCostUsd: number };

// USD / 1.000.000 token — giá model đang dùng (gpt-5.5, xem MODEL trong
// send-message.usecase.ts), tra cứu 31/07/2026. Đổi model thì PHẢI cập nhật
// lại giá ở đây — kiểm tra giá thật tại https://openai.com/api/pricing vì
// OpenAI có thể đổi giá bất kỳ lúc nào.
const PRICING_USD_PER_1M_TOKENS = { input: 5.0, output: 30.0 };

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
