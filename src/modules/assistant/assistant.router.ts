import { z } from "zod";

import { adminProcedure, createTRPCRouter, superadminProcedure } from "~/server/api/trpc";
import { logActivity } from "~/modules/activity-log/log-activity";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "~/lib/pagination";

import { createSession } from "./application/create-session.usecase";
import { listSessions } from "./application/list-sessions.usecase";
import { renameSession } from "./application/rename-session.usecase";
import { deleteSession } from "./application/delete-session.usecase";
import { getSessionWithMessages } from "./application/get-session-with-messages.usecase";
import { getUsageSummary } from "./application/get-usage-summary.usecase";
import { listAllSessions } from "./application/list-all-sessions.usecase";
import { getSessionDetailForAdmin } from "./application/get-session-detail-for-admin.usecase";
import { assistantDrizzleRepository } from "./infrastructure/assistant.drizzle-repository";

export const assistantRouter = createTRPCRouter({
  listSessions: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(({ ctx, input }) =>
      listSessions(assistantDrizzleRepository, { userId: ctx.session.user.id, ...input }),
    ),

  createSession: adminProcedure
    .input(z.object({ title: z.string().max(200).optional() }))
    .mutation(({ ctx, input }) =>
      createSession(assistantDrizzleRepository, {
        userId: ctx.session.user.id,
        title: input.title,
      }),
    ),

  getSession: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      getSessionWithMessages(assistantDrizzleRepository, {
        id: input.id,
        userId: ctx.session.user.id,
      }),
    ),

  renameSession: adminProcedure
    .input(z.object({ id: z.number().int().positive(), title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const session = await renameSession(assistantDrizzleRepository, {
        id: input.id,
        userId: ctx.session.user.id,
        title: input.title,
      });
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "assistant_session",
        entityId: String(session.id),
        metadata: { title: session.title },
      });
      return session;
    }),

  getUsageSummary: adminProcedure.query(({ ctx }) =>
    getUsageSummary(assistantDrizzleRepository, ctx.session.user.id),
  ),

  // Lượt chat thật (gọi model, chạy tool, lưu DB) đi qua Route Handler riêng
  // `api/assistant/chat` — tRPC mutation không stream token/tool-call theo
  // thời gian thực được (xem send-message.usecase.ts).

  deleteSession: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSession(assistantDrizzleRepository, {
        id: input.id,
        userId: ctx.session.user.id,
      });
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "assistant_session",
        entityId: String(input.id),
      });
    }),

  // Trang giám sát toàn hệ thống (/quan-ly/tro-ly-ai/lich-su) — chỉ superadmin,
  // xem được phiên chat của MỌI user, khác listSessions/getSession ở trên (tự
  // lọc theo ctx.session.user.id, dùng cho chính trang chat của người gọi).
  listAllSessions: superadminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        userId: z.string().optional(),
      }),
    )
    .query(({ input }) => listAllSessions(assistantDrizzleRepository, input)),

  getSessionDetail: superadminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => getSessionDetailForAdmin(assistantDrizzleRepository, input.id)),
});
