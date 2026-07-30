import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { logActivity } from "~/modules/activity-log/log-activity";

import { AssistantSessionNotFoundError } from "./domain/assistant.errors";
import { createSession } from "./application/create-session.usecase";
import { listSessions } from "./application/list-sessions.usecase";
import { renameSession } from "./application/rename-session.usecase";
import { deleteSession } from "./application/delete-session.usecase";
import { getSessionWithMessages } from "./application/get-session-with-messages.usecase";
import { getUsageSummary } from "./application/get-usage-summary.usecase";
import { AssistantRateLimitError, sendMessage } from "./application/send-message.usecase";
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

  // Xử lý 1 lượt chat hoàn toàn phía server, như mọi action khác trong app —
  // không có Route Handler/API riêng, không streaming (xem send-message.usecase.ts).
  sendMessage: adminProcedure
    .input(z.object({ sessionId: z.number().int().positive(), text: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendMessage(assistantDrizzleRepository, {
          sessionId: input.sessionId,
          userId: ctx.session.user.id,
          text: input.text,
        });
      } catch (error) {
        if (error instanceof AssistantSessionNotFoundError) {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        if (error instanceof AssistantRateLimitError) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: error.message });
        }
        throw error;
      }
    }),

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
});
