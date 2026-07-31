import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  toUIMessageStream,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { openai } from "@ai-sdk/openai";

import type { MenuItemRepository } from "~/modules/menu/domain/menu-item.repository";
import { AssistantSessionNotFoundError } from "../domain/assistant.errors";
import type { AssistantRepository } from "../domain/assistant.repository";
import { buildMessageParts } from "../infrastructure/build-message-parts";
import { generateFollowups } from "../infrastructure/generate-followups";
import { generateTitle } from "../infrastructure/generate-title";
import { checkRateLimit } from "../infrastructure/rate-limit";
import { buildCategoryContext, buildCurrentTimeContext, SYSTEM_PROMPT } from "../infrastructure/system-prompt";
import { assistantTools } from "../infrastructure/tools";

const MODEL = "gpt-5.5";

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
  menuItemRepository: MenuItemRepository,
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
  // touchSessionUpdatedAt chỉ cần gọi 1 lần sau khi lượt chat xong (không gọi
  // thêm ở đây) — cùng request nên giá trị này bị ghi đè ngay bởi lần touch
  // cuối, gọi 2 lần chỉ tốn thêm 1 round-trip DB không đổi kết quả.
  await repository.appendMessage({ sessionId, role: "user", parts: userParts });

  const currentUiMessage = { id: "current", role: "user" as const, parts: userParts } as UIMessage;
  const uiMessages = [
    ...priorMessages.map((m) => ({ id: String(m.id), role: m.role, parts: m.parts }) as UIMessage),
    currentUiMessage,
  ];
  const tools = assistantTools();
  // BẮT BUỘC truyền `tools` — thiếu nó, convertToModelMessages không biết
  // toolName nào ứng với tool nào để dựng lại đúng block tool-call/tool-result
  // từ lịch sử đã lưu.
  //
  // Tự vệ: nếu 1 message cũ trong lịch sử có `parts` không đúng hình dạng
  // UIMessage (dữ liệu cũ/hỏng), convertToModelMessages ném lỗi "messages do
  // not match ModelMessage[] schema" — và vì lỗi này KHÔNG phụ thuộc câu hỏi
  // mới, mọi lượt chat SAU trong phiên đó cũng sẽ hỏng y hệt (phiên bị
  // "nhiễm độc" vĩnh viễn). Fallback: bỏ hết lịch sử, trả lời riêng câu hỏi
  // hiện tại — mất ngữ cảnh cũ còn hơn phiên chết cứng không trả lời được nữa.
  //
  // categories (chỉ phục vụ system prompt) không phụ thuộc modelMessages —
  // chạy song song thay vì đợi tuần tự.
  const [modelMessages, categories] = await Promise.all([
    convertToModelMessages(uiMessages, { tools }).catch((error: unknown) => {
      console.error(
        `[assistant] convertToModelMessages thất bại cho session ${sessionId}, bỏ lịch sử cũ để tiếp tục:`,
        error,
      );
      return convertToModelMessages([currentUiMessage], { tools });
    }),
    menuItemRepository.listCategoryOptions(),
  ]);

  const result = streamText({
    model: openai(MODEL),
    system: SYSTEM_PROMPT + buildCurrentTimeContext() + buildCategoryContext(categories),
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
  // 4 việc độc lập sau khi có câu trả lời cuối: lưu message, touch session,
  // gợi ý câu hỏi tiếp theo (transient, không lưu DB), đặt tên phiên (chỉ ở
  // lượt đầu) — chạy song song thay vì đợi tuần tự từng bước.
  const [, , followups, title] = await Promise.all([
    // (message + touch session — kết quả không cần dùng, chỉ cần chạy xong)
    repository.appendMessage({
      sessionId,
      role: "assistant",
      parts: assistantParts,
      usage: {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      },
      model: MODEL,
    }),
    repository.touchSessionUpdatedAt(sessionId),
    generateFollowups(finalText),
    isFirstMessage ? generateTitle(text) : Promise.resolve(null),
  ]);

  if (followups.length > 0) {
    writer.write({ type: "data-followups", data: followups, transient: true });
  }
  if (title) await repository.renameSession(sessionId, userId, title);
}
