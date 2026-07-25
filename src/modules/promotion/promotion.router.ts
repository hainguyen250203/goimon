import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { managerProcedure, userProcedure, createTRPCRouter } from "~/server/api/trpc";
import { listPromotions } from "./application/list-promotions.usecase";
import { listActivePromotions } from "./application/list-active-promotions.usecase";
import { createPromotion } from "./application/create-promotion.usecase";
import { updatePromotion } from "./application/update-promotion.usecase";
import { deletePromotion } from "./application/delete-promotion.usecase";
import { promotionDrizzleRepository } from "./infrastructure/promotion.drizzle-repository";
import { logActivity } from "~/modules/activity-log/log-activity";

// Xem printer.router.ts — drizzle-zod@0.8 sinh schema kiểu zod/v4, không
// .extend() tương thích được với `z` classic nên viết tay thay vì sinh.
const promotionInputSchema = z.object({
  name: z.string().min(1, "Tên khuyến mãi không được để trống"),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().int().positive("Giá trị giảm phải lớn hơn 0"),
  isActive: z.boolean(),
});

export const promotionRouter = createTRPCRouter({
  list: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        isActive: z.boolean().optional(),
      }),
    )
    .query(({ input }) => listPromotions(promotionDrizzleRepository, input)),

  // Picker ở màn hình gọi món — mọi nhân viên đã đăng nhập đều gọi được.
  listActive: userProcedure.query(() => listActivePromotions(promotionDrizzleRepository)),

  create: managerProcedure
    .input(promotionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await createPromotion(promotionDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "promotion",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  update: managerProcedure
    .input(promotionInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const item = await updatePromotion(promotionDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "promotion",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deletePromotion(promotionDrizzleRepository, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error instanceof Error ? error.message : "Xoá thất bại.",
        });
      }
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "promotion",
        entityId: String(input.id),
      });
    }),
});
