import type { AssistantRepository, UsageSummaryRow } from "../domain/assistant.repository";
import { estimateCostUsd } from "../domain/usage-cost";

export type UsageSummaryItem = UsageSummaryRow & { estimatedCostUsd: number };

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
