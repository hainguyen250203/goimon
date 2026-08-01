import "dotenv/config";

import { assistantSession } from "~/modules/assistant/infrastructure/assistant.schema";
import { db } from "~/server/db";

/**
 * Xoá CỨNG toàn bộ phiên chat Trợ lý AI — KHÔNG phải xoá mềm (deletedAt).
 * assistant_messages có FK sessionId onDelete: "cascade" nên xoá session tự
 * xoá theo toàn bộ tin nhắn của nó, không cần xoá riêng. Dùng để dọn sạch
 * các phiên rác (vd phiên trùng do bug double-submit trước khi được fix).
 * KHÔNG hoàn tác được — chỉ chạy khi thật sự muốn xoá sạch lịch sử chat.
 */
async function wipeAssistantSessions() {
  const deleted = await db.delete(assistantSession).returning({ id: assistantSession.id });
  console.log(`Đã xoá cứng ${deleted.length} phiên chat Trợ lý AI (và toàn bộ tin nhắn liên quan).`);
}

wipeAssistantSessions()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Lỗi khi xoá phiên chat:", error);
    process.exit(1);
  });
