import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { managerProcedure, userProcedure, createTRPCRouter } from "~/server/api/trpc";
import { menuItemDrizzleRepository } from "~/modules/menu/infrastructure/menu-item.drizzle-repository";
import { restaurantTableDrizzleRepository } from "~/modules/table/infrastructure/restaurant-table.drizzle-repository";
import { promotionDrizzleRepository } from "~/modules/promotion/infrastructure/promotion.drizzle-repository";
import { listOrders } from "./application/list-orders.usecase";
import { listTablesForOrdering } from "./application/list-tables-for-ordering.usecase";
import { getTableOrder } from "./application/get-table-order.usecase";
import { addOrderItems } from "./application/add-order-items.usecase";
import { updateOrderItems } from "./application/update-order-items.usecase";
import { printOrder } from "./application/print-order.usecase";
import { confirmPayment } from "./application/confirm-payment.usecase";
import { cancelOrder } from "./application/cancel-order.usecase";
import { applyPromotion } from "./application/apply-promotion.usecase";
import { removePromotion } from "./application/remove-promotion.usecase";
import { orderDrizzleRepository } from "./infrastructure/order.drizzle-repository";
import {
  InvalidOrderStatusTransitionError,
  OrderItemNotFoundError,
  EmptyOrderError,
  PromotionNotAvailableError,
} from "./domain/order.errors";
import type { Order } from "./domain/order.entity";

// Domain error → TRPCError BAD_REQUEST với message tiếng Việt gốc thay vì
// để lộ generic 500 — áp dụng cho mọi mutation đụng vào state machine order.
async function runOrderAction<T extends Order>(action: () => Promise<T>) {
  try {
    return (await action()).toDetail();
  } catch (error) {
    if (
      error instanceof InvalidOrderStatusTransitionError ||
      error instanceof OrderItemNotFoundError ||
      error instanceof EmptyOrderError ||
      error instanceof PromotionNotAvailableError
    ) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}

export const orderRouter = createTRPCRouter({
  // Trang Đơn hàng (admin, chỉ hiển thị).
  list: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: z.enum(["open", "printed", "paid", "cancelled"]).optional(),
      }),
    )
    .query(({ input }) => listOrders(orderDrizzleRepository, input)),

  // Từ đây trở xuống: luồng gọi món (/goi-mon), mọi nhân viên đã đăng nhập đều gọi được.
  listTablesForOrdering: userProcedure.query(() =>
    listTablesForOrdering(restaurantTableDrizzleRepository, orderDrizzleRepository),
  ),

  getTableOrder: userProcedure
    .input(z.object({ tableId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const orderEntity = await getTableOrder(orderDrizzleRepository, input.tableId);
      return orderEntity ? orderEntity.toDetail() : null;
    }),

  addItems: userProcedure
    .input(
      z.object({
        tableId: z.number().int().positive(),
        items: z
          .array(
            z.object({
              menuItemId: z.number().int().positive(),
              quantity: z.number().int().positive(),
              note: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(({ ctx, input }) =>
      runOrderAction(() =>
        addOrderItems(orderDrizzleRepository, restaurantTableDrizzleRepository, menuItemDrizzleRepository, {
          tableId: input.tableId,
          actorId: ctx.session.user.id,
          items: input.items,
        }),
      ),
    ),

  // UI gom sửa số lượng/xoá món cục bộ (màn Món đã gọi), gọi 1 lần khi bấm
  // "Xác nhận" thay vì lưu ngay mỗi lần bấm +/- — xem submitted-order-panel.tsx.
  updateItems: userProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        changes: z.array(
          z.object({
            itemId: z.number().int().positive(),
            quantity: z.number().int().positive(),
          }),
        ),
        removedItemIds: z.array(z.number().int().positive()).default([]),
      }),
    )
    .mutation(({ ctx, input }) =>
      runOrderAction(() =>
        updateOrderItems(orderDrizzleRepository, {
          orderId: input.orderId,
          actorId: ctx.session.user.id,
          changes: input.changes,
          removedItemIds: input.removedItemIds,
        }),
      ),
    ),

  printBill: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      runOrderAction(() =>
        printOrder(orderDrizzleRepository, { orderId: input.orderId, actorId: ctx.session.user.id }),
      ),
    ),

  confirmPayment: userProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        paymentMethod: z.enum(["cash", "transfer"]),
      }),
    )
    .mutation(({ ctx, input }) =>
      runOrderAction(() =>
        confirmPayment(orderDrizzleRepository, restaurantTableDrizzleRepository, {
          orderId: input.orderId,
          actorId: ctx.session.user.id,
          paymentMethod: input.paymentMethod,
        }),
      ),
    ),

  cancel: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      runOrderAction(() =>
        cancelOrder(orderDrizzleRepository, restaurantTableDrizzleRepository, {
          orderId: input.orderId,
          actorId: ctx.session.user.id,
        }),
      ),
    ),

  applyPromotion: userProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        promotionId: z.number().int().positive(),
      }),
    )
    .mutation(({ ctx, input }) =>
      runOrderAction(() =>
        applyPromotion(orderDrizzleRepository, promotionDrizzleRepository, {
          orderId: input.orderId,
          promotionId: input.promotionId,
          actorId: ctx.session.user.id,
        }),
      ),
    ),

  removePromotion: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      runOrderAction(() =>
        removePromotion(orderDrizzleRepository, {
          orderId: input.orderId,
          actorId: ctx.session.user.id,
        }),
      ),
    ),
});
