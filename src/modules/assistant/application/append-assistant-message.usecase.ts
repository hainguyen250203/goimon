import type { AssistantMessage, AssistantMessageUsage } from "../domain/assistant-message.entity";
import type { AssistantRepository } from "../domain/assistant.repository";

export type AppendAssistantMessageParams = {
  sessionId: number;
  parts: unknown[];
  usage?: AssistantMessageUsage | null;
  model?: string | null;
};

/** Lưu toàn bộ lượt trả lời (text + tool-call + tool-result) thành 1 dòng, sau khi model trả lời xong. */
export async function appendAssistantMessage(
  repository: AssistantRepository,
  { sessionId, parts, usage, model }: AppendAssistantMessageParams,
): Promise<AssistantMessage> {
  const message = await repository.appendMessage({
    sessionId,
    role: "assistant",
    parts,
    usage,
    model,
  });
  await repository.touchSessionUpdatedAt(sessionId);
  return message;
}
