import type {
  AssistantRepository,
  ListAllSessionsParams,
  SessionWithOwner,
} from "../domain/assistant.repository";
import { estimateCostUsd } from "../domain/usage-cost";

export type SessionHistoryItem = SessionWithOwner & { estimatedCostUsd: number };

export type ListAllSessionsWithCostResult = {
  items: SessionHistoryItem[];
  total: number;
};

export async function listAllSessions(
  repository: AssistantRepository,
  params: ListAllSessionsParams,
): Promise<ListAllSessionsWithCostResult> {
  const { items, total } = await repository.listAllSessions(params);
  return {
    items: items.map((item) => ({
      ...item,
      estimatedCostUsd: estimateCostUsd(item.inputTokens, item.outputTokens),
    })),
    total,
  };
}
