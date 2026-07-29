import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { managerProcedure, userProcedure, createTRPCRouter } from "~/server/api/trpc";
import { openShift } from "./application/open-shift.usecase";
import { closeShift } from "./application/close-shift.usecase";
import { getOpenShift } from "./application/get-open-shift.usecase";
import { listShifts } from "./application/list-shifts.usecase";
import { getShiftSummary } from "./application/get-shift-summary.usecase";
import { shiftDrizzleRepository } from "./infrastructure/shift.drizzle-repository";
import { orderDrizzleRepository } from "~/modules/order/infrastructure/order.drizzle-repository";
import {
  NoOpenShiftError,
  ShiftAlreadyOpenError,
  ShiftHasActiveOrdersError,
} from "./domain/shift.errors";
import { logActivity } from "~/modules/activity-log/log-activity";

export const shiftRouter = createTRPCRouter({
  // Mọi nhân viên đều cần biết ca hiện có đang mở hay không để vào /goi-mon.
  getOpen: userProcedure.query(async () => {
    const shift = await getOpenShift(shiftDrizzleRepository);
    return shift ? shift.toDetail() : null;
  }),

  open: managerProcedure.mutation(async ({ ctx }) => {
    try {
      const shift = await openShift(shiftDrizzleRepository, ctx.session.user.id);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "shift",
        entityId: String(shift.toDetail().id),
      });
      return shift.toDetail();
    } catch (error) {
      if (error instanceof ShiftAlreadyOpenError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }
      throw error;
    }
  }),

  close: managerProcedure.mutation(async ({ ctx }) => {
    try {
      const { before, after } = await closeShift(shiftDrizzleRepository, orderDrizzleRepository, ctx.session.user.id);
      const afterDetail = after.toDetail();
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "shift",
        entityId: String(afterDetail.id),
        metadata: {
          before: { status: before.status, closedBy: before.closedBy },
          after: { status: afterDetail.status, closedBy: afterDetail.closedBy },
        },
      });
      return afterDetail;
    } catch (error) {
      if (error instanceof NoOpenShiftError || error instanceof ShiftHasActiveOrdersError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }
      throw error;
    }
  }),

  getSummary: managerProcedure
    .input(z.object({ shiftId: z.number().int().positive() }))
    .query(({ input }) => getShiftSummary(orderDrizzleRepository, input.shiftId)),

  list: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: z.enum(["open", "closed"]).optional(),
      }),
    )
    .query(({ input }) => listShifts(shiftDrizzleRepository, input)),
});
