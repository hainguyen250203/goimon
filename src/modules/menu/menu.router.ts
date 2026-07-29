import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { managerProcedure, userProcedure, createTRPCRouter } from "~/server/api/trpc";
import { listCategoryOptions } from "./application/list-category-options.usecase";
import { listMenuItems } from "./application/list-menu-items.usecase";
import { listForOrdering } from "./application/list-for-ordering.usecase";
import { createMenuItem } from "./application/create-menu-item.usecase";
import { updateMenuItem } from "./application/update-menu-item.usecase";
import { deleteMenuItem } from "./application/delete-menu-item.usecase";
import { listCategories } from "./application/list-categories.usecase";
import { createCategory } from "./application/create-category.usecase";
import { updateCategory } from "./application/update-category.usecase";
import { deleteCategory } from "./application/delete-category.usecase";
import { menuItemDrizzleRepository } from "./infrastructure/menu-item.drizzle-repository";
import { logActivity } from "~/modules/activity-log/log-activity";

const categoryInputSchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống"),
  isActive: z.boolean(),
});

// drizzle-zod@0.8 sinh schema kiểu zod/v4 (kể cả khi ép zodInstance về zod
// classic ở runtime, type khai báo trong package vẫn cố định là zod/v4) nên
// không .extend()/.omit() tương thích được với `z` (zod v3 classic) mà cả
// app đang dùng — viết tay schema input CRUD này thay vì sinh từ drizzle-zod.
const menuItemInputSchema = z.object({
  name: z.string().min(1, "Tên món không được để trống"),
  categoryId: z.number().int().positive(),
  price: z.number().positive("Giá phải lớn hơn 0"),
  isAvailable: z.boolean(),
  isPublished: z.boolean(),
});

export const menuRouter = createTRPCRouter({
  list: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        categoryId: z.number().int().positive().optional(),
      }),
    )
    .query(({ input }) => listMenuItems(menuItemDrizzleRepository, input)),

  listCategories: managerProcedure.query(() =>
    listCategoryOptions(menuItemDrizzleRepository),
  ),

  /** Cho màn hình gọi món (/goi-mon) — mọi nhân viên đã đăng nhập đều gọi được. */
  listForOrdering: userProcedure.query(() =>
    listForOrdering(menuItemDrizzleRepository),
  ),

  create: managerProcedure
    .input(menuItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await createMenuItem(menuItemDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "menu_item",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  update: managerProcedure
    .input(menuItemInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { before, after } = await updateMenuItem(menuItemDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "menu_item",
        entityId: String(after.id),
        metadata: {
          before: {
            name: before.name,
            categoryId: before.categoryId,
            price: before.price,
            isAvailable: before.isAvailable,
            isPublished: before.isPublished,
          },
          after: {
            name: after.name,
            categoryId: after.categoryId,
            price: after.price,
            isAvailable: after.isAvailable,
            isPublished: after.isPublished,
          },
        },
      });
      return after;
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteMenuItem(menuItemDrizzleRepository, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error instanceof Error ? error.message : "Xoá thất bại.",
        });
      }
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "menu_item",
        entityId: String(input.id),
      });
    }),

  // Quản trị danh mục — dialog "Quản lý danh mục" ở /quan-ly/mon-an.
  listCategoriesFull: managerProcedure.query(() =>
    listCategories(menuItemDrizzleRepository),
  ),

  createCategory: managerProcedure
    .input(categoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await createCategory(menuItemDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "category",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  updateCategory: managerProcedure
    .input(categoryInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { before, after } = await updateCategory(menuItemDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "category",
        entityId: String(after.id),
        metadata: {
          before: { name: before.name, isActive: before.isActive },
          after: { name: after.name, isActive: after.isActive },
        },
      });
      return after;
    }),

  deleteCategory: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteCategory(menuItemDrizzleRepository, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error instanceof Error ? error.message : "Xoá thất bại.",
        });
      }
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "category",
        entityId: String(input.id),
      });
    }),
});
