import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { managerProcedure, userProcedure, createTRPCRouter } from "~/server/api/trpc";
import { listAreaOptions } from "./application/list-area-options.usecase";
import { listTables } from "./application/list-tables.usecase";
import { createTable } from "./application/create-table.usecase";
import { updateTable } from "./application/update-table.usecase";
import { deleteTable } from "./application/delete-table.usecase";
import { listAreas } from "./application/list-areas.usecase";
import { createArea } from "./application/create-area.usecase";
import { updateArea } from "./application/update-area.usecase";
import { deleteArea } from "./application/delete-area.usecase";
import { restaurantTableDrizzleRepository } from "./infrastructure/restaurant-table.drizzle-repository";
import { logActivity } from "~/modules/activity-log/log-activity";

const areaInputSchema = z.object({
  name: z.string().min(1, "Tên khu vực không được để trống"),
  isActive: z.boolean(),
});

// Xem menu.router.ts — drizzle-zod@0.8 sinh schema kiểu zod/v4, không
// .extend() tương thích được với `z` classic nên viết tay thay vì sinh.
const tableInputSchema = z.object({
  name: z.string().min(1, "Tên bàn không được để trống"),
  areaId: z.number().int().positive(),
  status: z.enum(["available", "occupied"]),
});

export const tableRouter = createTRPCRouter({
  list: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        areaId: z.number().int().positive().optional(),
        status: z.enum(["available", "occupied"]).optional(),
      }),
    )
    .query(({ input }) => listTables(restaurantTableDrizzleRepository, input)),

  // userProcedure (không phải managerProcedure): màn hình gọi món (/goi-mon,
  // vai trò "user") cũng cần danh sách khu vực để chọn bàn — xem chỉ danh
  // sách id+name, không phải hành động quản trị nên không cần chặn ở mức manager.
  listAreas: userProcedure.query(() => listAreaOptions(restaurantTableDrizzleRepository)),

  create: managerProcedure
    .input(tableInputSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await createTable(restaurantTableDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "table",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  update: managerProcedure
    .input(tableInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { before, after } = await updateTable(restaurantTableDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "table",
        entityId: String(after.id),
        metadata: {
          before: { name: before.name, areaId: before.areaId, status: before.status },
          after: { name: after.name, areaId: after.areaId, status: after.status },
        },
      });
      return after;
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteTable(restaurantTableDrizzleRepository, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error instanceof Error ? error.message : "Xoá thất bại.",
        });
      }
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "table",
        entityId: String(input.id),
      });
    }),

  // Quản trị khu vực — dialog "Quản lý khu vực" ở /quan-ly/ban.
  listAreasFull: managerProcedure.query(() => listAreas(restaurantTableDrizzleRepository)),

  createArea: managerProcedure
    .input(areaInputSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await createArea(restaurantTableDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "area",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  updateArea: managerProcedure
    .input(areaInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { before, after } = await updateArea(restaurantTableDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "area",
        entityId: String(after.id),
        metadata: {
          before: { name: before.name, isActive: before.isActive },
          after: { name: after.name, isActive: after.isActive },
        },
      });
      return after;
    }),

  deleteArea: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteArea(restaurantTableDrizzleRepository, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error instanceof Error ? error.message : "Xoá thất bại.",
        });
      }
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "area",
        entityId: String(input.id),
      });
    }),
});
