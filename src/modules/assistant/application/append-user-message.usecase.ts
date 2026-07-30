import type { AssistantMessage } from "../domain/assistant-message.entity";
import type { AssistantRepository } from "../domain/assistant.repository";

export type AppendUserMessageParams = {
  sessionId: number;
  parts: unknown[];
};

/**
 * Lưu tin nhắn của người dùng NGAY khi nhận request, trước khi gọi LLM — để
 * nếu server crash giữa chừng lượt chat, tin nhắn người dùng vẫn không mất.
 */
export async function appendUserMessage(
  repository: AssistantRepository,
  { sessionId, parts }: AppendUserMessageParams,
): Promise<AssistantMessage> {
  const message = await repository.appendMessage({ sessionId, role: "user", parts });
  await repository.touchSessionUpdatedAt(sessionId);
  return message;
}
