import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { userProcedure, createTRPCRouter } from "~/server/api/trpc";
import { menuItemDrizzleRepository } from "~/modules/menu/infrastructure/menu-item.drizzle-repository";
import { restaurantTableDrizzleRepository } from "~/modules/table/infrastructure/restaurant-table.drizzle-repository";
import { promotionDrizzleRepository } from "~/modules/promotion/infrastructure/promotion.drizzle-repository";
import { listOrders } from "./application/list-orders.usecase";
import { listOrderItemEvents } from "./application/list-order-item-events.usecase";
import { getOrderTimeline } from "./application/get-order-timeline.usecase";
import { listTablesForOrdering } from "./application/list-tables-for-ordering.usecase";
import { getTableOrder } from "./application/get-table-order.usecase";
import { addOrderItems } from "./application/add-order-items.usecase";
import { updateOrderItems } from "./application/update-order-items.usecase";
import { printOrder } from "./application/print-order.usecase";
import { confirmPayment } from "./application/confirm-payment.usecase";
import { cancelOrder } from "./application/cancel-order.usecase";
import { applyPromotion } from "./application/apply-promotion.usecase";
import { removePromotion } from "./application/remove-promotion.usecase";
import { moveOrderTable } from "./application/move-order-table.usecase";
import { transferOrderItems } from "./application/transfer-order-items.usecase";
import { orderDrizzleRepository } from "./infrastructure/order.drizzle-repository";
import { shiftDrizzleRepository } from "~/modules/shift/infrastructure/shift.drizzle-repository";
import {
  InvalidOrderStatusTransitionError,
  OrderItemNotFoundError,
  EmptyOrderError,
  PromotionNotAvailableError,
  InvalidTableTransferError,
} from "./domain/order.errors";
import type { Order } from "./domain/order.entity";

// Domain error → TRPCError BAD_REQUEST với message tiếng Việt gốc thay vì
// để lộ generic 500 — áp dụng cho mọi mutation đụng vào state machine order.
function mapOrderDomainError(error: unknown): never {
  if (
    error instanceof InvalidOrderStatusTransitionError ||
    error instanceof OrderItemNotFoundError ||
    error instanceof EmptyOrderError ||
    error instanceof PromotionNotAvailableError ||
    error instanceof InvalidTableTransferError
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  throw error;
}

async function runOrderAction<T extends Order>(action: () => Promise<T>) {
  try {
    return (await action()).toDetail();
  } catch (error) {
    mapOrderDomainError(error);
  }
}

// Mọi mutation của luồng gọi món đều cần ca đang mở — chặn ở đây (không chỉ
// chặn UI) để phòng trường hợp gọi thẳng API. Trả về shiftId cho addItems
// gắn vào order mới; các mutation khác chỉ cần chặn, không cần dùng giá trị.
async function requireOpenShift(): Promise<number> {
  const shift = await shiftDrizzleRepository.findOpen();
  if (!shift?.id) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Ca làm việc chưa được mở." });
  }
  return shift.id;
}

export const orderRouter = createTRPCRouter({
  // Trang Đơn hàng (admin /quan-ly/don-hang, chỉ hiển thị) — cũng được trang
  // Lịch sử đơn hàng ở /goi-mon/cua-hang tái dùng nên là userProcedure, không
  // chỉ managerProcedure như trước. `search` lọc đơn có món khớp tên (không
  // dấu, server-side) — dùng cho ô tìm kiếm ở trang Lịch sử đơn hàng.
  // Role "user" (nhân viên) chỉ xem được đơn do chính mình tạo ở trang Lịch
  // sử đơn hàng — manager/admin xem được toàn bộ (cả ở đây lẫn ở trang admin).
  list: userProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: z.enum(["open", "paid", "cancelled"]).optional(),
        search: z.string().optional(),
        shiftId: z.number().int().positive().optional(),
      }),
    )
    .query(({ ctx, input }) => {
      const createdBy = ctx.session.user.role === "user" ? ctx.session.user.id : undefined;
      return listOrders(orderDrizzleRepository, { ...input, createdBy });
    }),

  // Lịch sử gọi món (event "items_added"/"items_removed" trong order_events)
  // — ai gọi/trả món gì, lúc nào, bàn nào. Khác list ở trên (đó là theo ĐƠN,
  // cái này theo TỪNG LẦN gọi/trả món). Tìm không dấu server-side trên items_summary.
  // Role "user" chỉ xem được hành động do chính mình thao tác (khác trang
  // list ở trên lọc theo NGƯỜI TẠO ĐƠN — ở đây lọc theo NGƯỜI THAO TÁC event).
  listOrderItemEvents: userProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
      }),
    )
    .query(({ ctx, input }) => {
      const actorId = ctx.session.user.role === "user" ? ctx.session.user.id : undefined;
      return listOrderItemEvents(orderDrizzleRepository, { ...input, actorId });
    }),

  // Toàn bộ timeline của 1 order cụ thể (gọi món, trả món, in bill, thanh
  // toán, khuyến mãi, huỷ...) — trang lịch sử riêng của order đó ở /goi-mon.
  getOrderTimeline: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .query(({ input }) => getOrderTimeline(orderDrizzleRepository, input.orderId)),

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
    .mutation(async ({ ctx, input }) => {
      const shiftId = await requireOpenShift();
      return runOrderAction(() =>
        addOrderItems(orderDrizzleRepository, restaurantTableDrizzleRepository, menuItemDrizzleRepository, {
          tableId: input.tableId,
          actorId: ctx.session.user.id,
          shiftId,
          items: input.items,
        }),
      );
    }),

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
    .mutation(async ({ ctx, input }) => {
      await requireOpenShift();
      return runOrderAction(() =>
        updateOrderItems(orderDrizzleRepository, restaurantTableDrizzleRepository, {
          orderId: input.orderId,
          actorId: ctx.session.user.id,
          changes: input.changes,
          removedItemIds: input.removedItemIds,
        }),
      );
    }),

  printBill: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await requireOpenShift();
      return runOrderAction(() =>
        printOrder(orderDrizzleRepository, { orderId: input.orderId }),
      );
    }),

  confirmPayment: userProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        paymentMethod: z.enum(["cash", "transfer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOpenShift();
      return runOrderAction(() =>
        confirmPayment(orderDrizzleRepository, restaurantTableDrizzleRepository, {
          orderId: input.orderId,
          actorId: ctx.session.user.id,
          paymentMethod: input.paymentMethod,
        }),
      );
    }),

  cancel: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireOpenShift();
      return runOrderAction(() =>
        cancelOrder(orderDrizzleRepository, restaurantTableDrizzleRepository, {
          orderId: input.orderId,
          actorId: ctx.session.user.id,
        }),
      );
    }),

  applyPromotion: userProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        promotionId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOpenShift();
      return runOrderAction(() =>
        applyPromotion(orderDrizzleRepository, promotionDrizzleRepository, {
          orderId: input.orderId,
          promotionId: input.promotionId,
          actorId: ctx.session.user.id,
        }),
      );
    }),

  removePromotion: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireOpenShift();
      return runOrderAction(() =>
        removePromotion(orderDrizzleRepository, {
          orderId: input.orderId,
          actorId: ctx.session.user.id,
        }),
      );
    }),

  // Chuyển đơn đang phục vụ sang bàn khác (khách đổi bàn) — chỉ chuyển được
  // tới bàn đang trống, dialog UI (table-switcher-dialog.tsx) chỉ cho chọn
  // bàn trống nhưng vẫn phải chặn lại ở đây phòng gọi thẳng API.
  moveTable: userProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        targetTableId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOpenShift();
      return runOrderAction(() =>
        moveOrderTable(orderDrizzleRepository, restaurantTableDrizzleRepository, {
          orderId: input.orderId,
          targetTableId: input.targetTableId,
          actorId: ctx.session.user.id,
        }),
      );
    }),

  // Chuyển 1 phần món (có thể chỉ 1 phần số lượng) từ đơn bàn này sang
  // order_id của bàn khác — gộp vào đơn đang mở sẵn ở bàn đích hoặc tự mở đơn
  // mới nếu bàn đích đang trống. Khác moveTable (chuyển NGUYÊN đơn sang bàn
  // trống) — đơn nguồn ở đây vẫn tiếp tục tồn tại nếu còn món.
  transferItems: userProcedure
    .input(
      z.object({
        sourceOrderId: z.number().int().positive(),
        items: z
          .array(
            z.object({
              itemId: z.number().int().positive(),
              quantity: z.number().int().positive(),
            }),
          )
          .min(1),
        targetTableId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const shiftId = await requireOpenShift();
      try {
        const { source, target } = await transferOrderItems(
          orderDrizzleRepository,
          restaurantTableDrizzleRepository,
          {
            sourceOrderId: input.sourceOrderId,
            items: input.items,
            targetTableId: input.targetTableId,
            actorId: ctx.session.user.id,
            shiftId,
          },
        );
        return { source: source?.toDetail() ?? null, target: target.toDetail() };
      } catch (error) {
        mapOrderDomainError(error);
      }
    }),
});
