import { convertToModelMessages, generateText, stepCountIs, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";

import { AssistantSessionNotFoundError } from "../domain/assistant.errors";
import type { AssistantRepository } from "../domain/assistant.repository";
import { buildMessageParts, type StoredMessagePart } from "../infrastructure/build-message-parts";
import { generateFollowups } from "../infrastructure/generate-followups";
import { generateTitle } from "../infrastructure/generate-title";
import { checkRateLimit } from "../infrastructure/rate-limit";
import { buildCurrentTimeContext, SYSTEM_PROMPT } from "../infrastructure/system-prompt";
import { assistantTools } from "../infrastructure/tools";

const MODEL = "gpt-4.1";

export class AssistantRateLimitError extends Error {
  constructor() {
    super("Bạn đã hỏi quá nhiều trong ít phút, vui lòng thử lại sau.");
    this.name = "AssistantRateLimitError";
  }
}

export type SendMessageParams = {
  sessionId: number;
  userId: string;
  text: string;
};

export type SendMessageResult = {
  assistantParts: StoredMessagePart[];
  followups: string[];
  /** Chỉ có giá trị khi đây là lượt đầu tiên của phiên — sidebar dùng để cập nhật ngay không cần fetch lại. */
  title: string | null;
};

/**
 * Không dùng streaming (xem generate-title.ts/generate-followups.ts để biết lý
 * do đổi sang tRPC mutation thường thay vì Route Handler + streamText) — toàn
 * bộ lượt chat (gọi model, chạy tool, lưu DB, đặt tên phiên, gợi ý câu hỏi
 * tiếp theo) chạy trong 1 lần gọi, trả về khi đã xong hết.
 */
export async function sendMessage(
  repository: AssistantRepository,
  { sessionId, userId, text }: SendMessageParams,
): Promise<SendMessageResult> {
  if (!checkRateLimit(userId).allowed) {
    throw new AssistantRateLimitError();
  }

  const session = await repository.findSessionById(sessionId, userId);
  if (!session) throw new AssistantSessionNotFoundError();

  const priorMessages = await repository.listMessages(sessionId);
  const isFirstMessage = priorMessages.length === 0;

  const userParts = [{ type: "text" as const, text }];
  await repository.appendMessage({ sessionId, role: "user", parts: userParts });
  await repository.touchSessionUpdatedAt(sessionId);

  const uiMessages = [
    ...priorMessages.map((m) => ({ id: String(m.id), role: m.role, parts: m.parts }) as UIMessage),
    { id: "current", role: "user" as const, parts: userParts } as UIMessage,
  ];
  const modelMessages = await convertToModelMessages(uiMessages);

  const result = await generateText({
    model: openai(MODEL),
    system: SYSTEM_PROMPT + buildCurrentTimeContext(),
    messages: modelMessages,
    tools: assistantTools(),
    stopWhen: stepCountIs(6),
  });

  const assistantParts = buildMessageParts(result.steps);
  await repository.appendMessage({
    sessionId,
    role: "assistant",
    parts: assistantParts,
    usage: {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    },
    model: MODEL,
  });
  await repository.touchSessionUpdatedAt(sessionId);

  const followups = await generateFollowups(result.text);

  let title: string | null = null;
  if (isFirstMessage) {
    title = await generateTitle(text);
    if (title) await repository.renameSession(sessionId, userId, title);
  }

  return { assistantParts, followups, title };
}
