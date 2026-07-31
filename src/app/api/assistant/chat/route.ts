import { type NextRequest } from "next/server";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

import { getSession } from "~/server/better-auth/server";
import { assistantDrizzleRepository } from "~/modules/assistant/infrastructure/assistant.drizzle-repository";
import { menuItemDrizzleRepository } from "~/modules/menu/infrastructure/menu-item.drizzle-repository";
import {
  AssistantRateLimitError,
  streamAssistantReply,
} from "~/modules/assistant/application/send-message.usecase";
import { AssistantSessionNotFoundError } from "~/modules/assistant/domain/assistant.errors";

// Route Handler riêng cho lượt chat (POST = 1 câu hỏi, response là UI Message
// Stream/SSE cho useChat) — tRPC mutation không stream được token/tool-call
// theo thời gian thực (xem send-message.usecase.ts). Đây là lớp enforcement
// THẬT: check role admin ngay tại route (giống adminProcedure), không đi qua
// tRPC nên phải tự kiểm tra.
//
// Body do client tự dựng qua `prepareSendMessagesRequest` (xem chat-panel.tsx)
// — chỉ gửi đúng {sessionId, text} thay vì cả mảng messages, vì server đã có
// sẵn toàn bộ lịch sử trong DB (client không cần gửi lại, cũng không được
// tin tưởng lịch sử từ client).
type ChatRequestBody = {
  sessionId?: number;
  text?: string;
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.user.role !== "admin") {
    return new Response("Bạn không có quyền dùng trợ lý AI.", { status: 403 });
  }
  const userId = session.user.id;

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("Body không hợp lệ.", { status: 400 });
  }

  const sessionId = body.sessionId;
  if (typeof sessionId !== "number" || !Number.isInteger(sessionId) || sessionId <= 0) {
    return new Response("Session id không hợp lệ.", { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) return new Response("Tin nhắn rỗng.", { status: 400 });
  if (text.length > 4000) return new Response("Tin nhắn quá dài.", { status: 400 });

  const stream = createUIMessageStream({
    execute: ({ writer }) =>
      streamAssistantReply(
        assistantDrizzleRepository,
        menuItemDrizzleRepository,
        { sessionId, userId, text },
        writer,
      ),
    onError: (error) => {
      if (error instanceof AssistantRateLimitError) return error.message;
      if (error instanceof AssistantSessionNotFoundError) return error.message;
      // Log thẳng Error object — Node tự in kèm .cause lồng nhau, không cần tự
      // đào tay. Lỗi thật (OpenAI, DB, tool, schema...) không được che hết
      // chi tiết cho client.
      console.error("[assistant/chat] lỗi không xác định:", error);
      return error instanceof Error ? error.message : "Trợ lý gặp lỗi không xác định.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
