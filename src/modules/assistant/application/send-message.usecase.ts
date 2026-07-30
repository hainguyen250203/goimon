import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  toUIMessageStream,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { openai } from "@ai-sdk/openai";

import { AssistantSessionNotFoundError } from "../domain/assistant.errors";
import type { AssistantRepository } from "../domain/assistant.repository";
import { buildMessageParts } from "../infrastructure/build-message-parts";
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

/**
 * Chạy 1 lượt chat và stream trực tiếp xuống `writer` (UI message stream) —
 * dùng bởi Route Handler `api/assistant/chat` (không phải tRPC, vì tRPC
 * mutation không stream được token/tool-call theo thời gian thực). `writer`
 * do `createUIMessageStream` cấp; hàm này chỉ có tác dụng phụ (ghi vào writer
 * + persist DB), không trả kết quả — client nhận toàn bộ qua stream.
 */
export async function streamAssistantReply(
  repository: AssistantRepository,
  { sessionId, userId, text }: SendMessageParams,
  writer: UIMessageStreamWriter,
): Promise<void> {
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

  const tools = assistantTools();
  const result = streamText({
    model: openai(MODEL),
    system: SYSTEM_PROMPT + buildCurrentTimeContext(),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(6),
  });

  // merge() bơm chunk (text-delta/tool-call/tool-result) xuống client NGAY khi
  // có, chạy nền song song — không chặn dòng code bên dưới.
  writer.merge(toUIMessageStream({ stream: result.stream, tools }));

  // `result.text`/`result.steps`/`result.usage` đều "tự tiêu thụ" stream nếu
  // chưa ai đọc — an toàn gọi song song với merge() ở trên vì cùng đọc từ 1
  // nguồn generation dùng chung (không tạo thêm lệnh gọi model nào khác).
  const [finalText, steps, usage] = await Promise.all([result.text, result.steps, result.usage]);

  const assistantParts = buildMessageParts(steps);
  await repository.appendMessage({
    sessionId,
    role: "assistant",
    parts: assistantParts,
    usage: {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    },
    model: MODEL,
  });
  await repository.touchSessionUpdatedAt(sessionId);

  // Gợi ý câu hỏi tiếp theo — transient part, không lưu DB (xem generate-followups.ts).
  const followups = await generateFollowups(finalText);
  if (followups.length > 0) {
    writer.write({ type: "data-followups", data: followups, transient: true });
  }

  if (isFirstMessage) {
    const title = await generateTitle(text);
    if (title) await repository.renameSession(sessionId, userId, title);
  }
}
