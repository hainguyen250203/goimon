import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { managerProcedure, createTRPCRouter } from "~/server/api/trpc";
import { listPrinters } from "./application/list-printers.usecase";
import { createPrinter } from "./application/create-printer.usecase";
import { updatePrinter } from "./application/update-printer.usecase";
import { deletePrinter } from "./application/delete-printer.usecase";
import { printerDrizzleRepository } from "./infrastructure/printer.drizzle-repository";
import { logActivity } from "~/modules/activity-log/log-activity";

// Xem menu.router.ts — drizzle-zod@0.8 sinh schema kiểu zod/v4, không
// .extend() tương thích được với `z` classic nên viết tay thay vì sinh.
const printerInputSchema = z.object({
  name: z.string().min(1, "Tên máy in không được để trống"),
  ipAddress: z
    .string()
    .min(1, "Địa chỉ IP không được để trống")
    .regex(
      /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
      "Địa chỉ IP không hợp lệ",
    ),
  port: z.number().int().min(1).max(65535),
  isActive: z.boolean(),
});

export const printerRouter = createTRPCRouter({
  list: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        isActive: z.boolean().optional(),
      }),
    )
    .query(({ input }) => listPrinters(printerDrizzleRepository, input)),

  create: managerProcedure
    .input(printerInputSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await createPrinter(printerDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "printer",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  update: managerProcedure
    .input(printerInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const item = await updatePrinter(printerDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "printer",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deletePrinter(printerDrizzleRepository, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error instanceof Error ? error.message : "Xoá thất bại.",
        });
      }
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "printer",
        entityId: String(input.id),
      });
    }),
});
