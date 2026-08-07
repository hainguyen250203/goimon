import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { permissionProcedure, staffProcedure, createTRPCRouter } from "~/server/api/trpc";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "~/lib/pagination";
import { orderDrizzleRepository } from "~/modules/order/infrastructure/order.drizzle-repository";
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
});

export const tableRouter = createTRPCRouter({
  list: permissionProcedure("ban.get")
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        areaId: z.number().int().positive().optional(),
        status: z.enum(["available", "occupied"]).optional(),
      }),
    )
    .query(({ input }) => listTables(restaurantTableDrizzleRepository, orderDrizzleRepository, input)),

  // staffProcedure (không cần permission key): màn hình gọi món (/goi-mon)
  // cần danh sách khu vực để chọn bàn — bất kỳ ai đã đăng nhập đều gọi được.
  listAreas: staffProcedure.query(() => listAreaOptions(restaurantTableDrizzleRepository)),

  create: permissionProcedure("ban.tao")
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

  update: permissionProcedure("ban.sua")
    .input(tableInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { before, after } = await updateTable(restaurantTableDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "table",
        entityId: String(after.id),
        metadata: {
          before: { name: before.name, areaId: before.areaId },
          after: { name: after.name, areaId: after.areaId },
        },
      });
      return after;
    }),

  delete: permissionProcedure("ban.xoa")
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
  listAreasFull: permissionProcedure("ban.get").query(() => listAreas(restaurantTableDrizzleRepository)),

  createArea: permissionProcedure("ban.khu-vuc")
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

  updateArea: permissionProcedure("ban.khu-vuc")
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

  deleteArea: permissionProcedure("ban.khu-vuc")
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
