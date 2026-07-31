import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "~/server/db";
import type {
  AppendMessageParams,
  AssistantRepository,
  CreateSessionParams,
  ListSessionsParams,
  ListSessionsResult,
  UsageSummaryRow,
  UsageTotals,
} from "../domain/assistant.repository";
import type { AssistantMessage } from "../domain/assistant-message.entity";
import type { AssistantSession } from "../domain/assistant-session.entity";

import { assistantMessage, assistantSession } from "./assistant.schema";
import { toMessageEntity, toSessionEntity } from "./assistant.mapper";

export const assistantDrizzleRepository: AssistantRepository = {
  async createSession({ userId, title }: CreateSessionParams): Promise<AssistantSession> {
    const [row] = await db
      .insert(assistantSession)
      .values({ userId, title: title ?? null })
      .returning();
    if (!row) throw new Error("Tạo phiên trò chuyện thất bại.");
    return toSessionEntity(row);
  },

  async listSessions({
    userId,
    page,
    pageSize,
  }: ListSessionsParams): Promise<ListSessionsResult> {
    const offset = (page - 1) * pageSize;
    const where = and(eq(assistantSession.userId, userId), isNull(assistantSession.deletedAt));

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(assistantSession)
        .where(where)
        .orderBy(desc(assistantSession.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(assistantSession).where(where),
    ]);

    return {
      items: rows.map(toSessionEntity),
      total: totalRows[0]?.value ?? 0,
    };
  },

  async findSessionById(id: number, userId: string): Promise<AssistantSession | null> {
    const rows = await db
      .select()
      .from(assistantSession)
      .where(
        and(
          eq(assistantSession.id, id),
          eq(assistantSession.userId, userId),
          isNull(assistantSession.deletedAt),
        ),
      );
    const row = rows[0];
    return row ? toSessionEntity(row) : null;
  },

  async renameSession(id: number, userId: string, title: string): Promise<AssistantSession> {
    const [row] = await db
      .update(assistantSession)
      .set({ title })
      .where(and(eq(assistantSession.id, id), eq(assistantSession.userId, userId)))
      .returning();
    if (!row) throw new Error("Không tìm thấy phiên trò chuyện để đổi tên.");
    return toSessionEntity(row);
  },

  async softDeleteSession(id: number, userId: string): Promise<void> {
    await db
      .update(assistantSession)
      .set({ deletedAt: new Date() })
      .where(and(eq(assistantSession.id, id), eq(assistantSession.userId, userId)));
  },

  async listMessages(sessionId: number): Promise<AssistantMessage[]> {
    const rows = await db
      .select()
      .from(assistantMessage)
      .where(eq(assistantMessage.sessionId, sessionId))
      .orderBy(assistantMessage.createdAt);
    return rows.map(toMessageEntity);
  },

  async appendMessage(params: AppendMessageParams): Promise<AssistantMessage> {
    const [row] = await db
      .insert(assistantMessage)
      .values({
        sessionId: params.sessionId,
        role: params.role,
        contentJson: params.parts,
        usageJson: params.usage ?? null,
        model: params.model ?? null,
      })
      .returning();
    if (!row) throw new Error("Lưu tin nhắn thất bại.");
    return toMessageEntity(row);
  },

  async touchSessionUpdatedAt(sessionId: number): Promise<void> {
    await db
      .update(assistantSession)
      .set({ updatedAt: new Date() })
      .where(eq(assistantSession.id, sessionId));
  },

  async getUsageSummary(userId: string): Promise<UsageSummaryRow[]> {
    // Không lọc deletedAt — phiên đã xoá mềm vẫn phải tính vào chi phí (tiền
    // đã trả cho OpenAI rồi), UI tự hiện nhãn "Đã xoá" để phân biệt.
    const rows = await db
      .select({
        sessionId: assistantSession.id,
        title: assistantSession.title,
        messageCount: count(assistantMessage.id),
        inputTokens: sql<number>`coalesce(sum((${assistantMessage.usageJson}->>'inputTokens')::int), 0)`,
        outputTokens: sql<number>`coalesce(sum((${assistantMessage.usageJson}->>'outputTokens')::int), 0)`,
        deletedAt: assistantSession.deletedAt,
      })
      .from(assistantSession)
      .leftJoin(
        assistantMessage,
        and(eq(assistantMessage.sessionId, assistantSession.id), eq(assistantMessage.role, "assistant")),
      )
      .where(eq(assistantSession.userId, userId))
      .groupBy(assistantSession.id)
      // Phiên đã xoá luôn đẩy xuống cuối bất kể updatedAt (thao tác xoá cũng
      // cập nhật updatedAt nên nếu không tách riêng, phiên vừa xoá sẽ nhảy
      // lên đầu danh sách thay vì lịch sử chat mới nhất).
      .orderBy(sql`${assistantSession.deletedAt} is not null`, desc(assistantSession.updatedAt));

    return rows;
  },

  async getUsageTotalsInRange({ start, end }): Promise<UsageTotals> {
    const [row] = await db
      .select({
        inputTokens: sql<number>`coalesce(sum((${assistantMessage.usageJson}->>'inputTokens')::int), 0)`,
        outputTokens: sql<number>`coalesce(sum((${assistantMessage.usageJson}->>'outputTokens')::int), 0)`,
      })
      .from(assistantMessage)
      .where(
        and(
          eq(assistantMessage.role, "assistant"),
          gte(assistantMessage.createdAt, start),
          lt(assistantMessage.createdAt, end),
        ),
      );
    return { inputTokens: row?.inputTokens ?? 0, outputTokens: row?.outputTokens ?? 0 };
  },
};
