import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { adminProcedure, userProcedure, createTRPCRouter } from "~/server/api/trpc";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "~/lib/pagination";
import { logActivity } from "~/modules/activity-log/log-activity";
import { menuItemDrizzleRepository } from "~/modules/menu/infrastructure/menu-item.drizzle-repository";
import { restaurantTableDrizzleRepository } from "~/modules/table/infrastructure/restaurant-table.drizzle-repository";
import { promotionDrizzleRepository } from "~/modules/promotion/infrastructure/promotion.drizzle-repository";
import { listOrders } from "./application/list-orders.usecase";
import { listOrderItemEvents } from "./application/list-order-item-events.usecase";
import { listTableTransferEvents } from "./application/list-table-transfer-events.usecase";
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
import { mergeOrders } from "./application/merge-orders.usecase";
import { deleteOrder } from "./application/delete-order.usecase";
import { orderDrizzleRepository } from "./infrastructure/order.drizzle-repository";
import { shiftDrizzleRepository } from "~/modules/shift/infrastructure/shift.drizzle-repository";
import { paymentConfigDrizzleRepository } from "~/modules/payment-config/infrastructure/payment-config.drizzle-repository";
import { printerDrizzleRepository } from "~/modules/printer/infrastructure/printer.drizzle-repository";
import { escposBillPrinter } from "~/modules/printer/infrastructure/escpos-bill-printer";
import { printBillToPrinters } from "~/modules/printer/application/print-bill-to-printers.usecase";
import { printKitchenTicket } from "~/modules/printer/application/print-kitchen-ticket.usecase";
import { escposKitchenTicketPrinter } from "~/modules/printer/infrastructure/escpos-kitchen-ticket-printer";
import { SHOP_INFO } from "~/modules/printer/domain/shop-info";
import type { BillPrintPayload } from "~/modules/printer/domain/bill-print-payload";
import type { KitchenTicketPayload } from "~/modules/printer/domain/kitchen-ticket-payload";
import type { PrintOutcome } from "~/modules/printer/domain/print-outcome";
import { buildVietQrImageUrl } from "~/lib/vietqr";
import {
  InvalidOrderStatusTransitionError,
  OrderItemNotFoundError,
  EmptyOrderError,
  PromotionNotAvailableError,
  InvalidTableTransferError,
} from "./domain/order.errors";
import type { Order, OrderPromotion } from "./domain/order.entity";

// Chỉ hiện nhãn chung "Khuyến mãi" trên hoá đơn — không in tên/tỉ lệ khuyến
// mãi cụ thể (số tiền giảm đã tự hiện riêng ở cột bên phải, xem
// bill-image-renderer.ts). null nếu đơn không áp dụng khuyến mãi nào.
function buildDiscountLabel(promotion: OrderPromotion | null): string | null {
  return promotion ? "Khuyến mãi" : null;
}

// Một số món (bia, nước ngọt...) không cần bếp chuẩn bị — lọc theo cờ
// `printToKitchen` của menu item trước khi build phiếu bếp. CHỈ ảnh hưởng
// phiếu bếp, không đụng tới hoá đơn thanh toán (buildBillPayload không gọi
// hàm này). Dùng generic để tái dùng cho cả 4 điểm gọi (gọi món/huỷ món/
// chuyển bàn/chuyển món), input chỉ cần có `menuItemId`.
async function filterPrintableToKitchen<
  T extends { menuItemId: number; itemName: string; quantity: number; note: string | null },
>(items: T[]): Promise<{ itemName: string; quantity: number; note: string | null }[]> {
  if (items.length === 0) return [];
  const menuItems = await menuItemDrizzleRepository.findByIds(items.map((i) => i.menuItemId));
  const printableIds = new Set(menuItems.filter((m) => m.printToKitchen).map((m) => m.id));
  return items
    .filter((i) => printableIds.has(i.menuItemId))
    .map((i) => ({ itemName: i.itemName, quantity: i.quantity, note: i.note }));
}

// Bọc printKitchenTicket — KHÔNG gọi máy in nếu sau khi lọc printToKitchen
// không còn món nào (vd cả đơn/cả lượt chuyển chỉ toàn bia/nước ngọt). Tránh
// tốn giấy in 1 phiếu trống chỉ có tiêu đề, và tránh gọi mạng tới máy in vô ích.
async function printKitchenTicketIfAny(
  items: KitchenTicketPayload["items"],
  payload: Omit<KitchenTicketPayload, "items">,
): Promise<PrintOutcome[]> {
  if (items.length === 0) return [];
  return printKitchenTicket(printerDrizzleRepository, escposKitchenTicketPrinter, { ...payload, items });
}

// Chặn CỨNG (throw trước khi mutate) nếu thao tác có ít nhất 1 món cần bếp
// chuẩn bị (printToKitchen=true) mà chưa cấu hình máy in bếp nào — khác hẳn
// printKitchenTicketIfAny (best-effort, không throw): đây là điều kiện tiên
// quyết để ĐƯỢC PHÉP thao tác, không phải kết quả của việc in. Đơn/thao tác
// toàn món không cần bếp (bia, nước ngọt...) vẫn qua bình thường.
async function requireKitchenPrinterFor(menuItemIds: number[], actionLabel: string): Promise<void> {
  if (menuItemIds.length === 0) return;
  const menuItems = await menuItemDrizzleRepository.findByIds(menuItemIds);
  const needsKitchen = menuItems.some((m) => m.printToKitchen);
  if (!needsKitchen) return;
  const printers = await printerDrizzleRepository.listActiveByType("kitchen");
  if (printers.length === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Chưa cấu hình máy in bếp, không thể ${actionLabel}.`,
    });
  }
}

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
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        status: z.enum(["open", "paid", "cancelled", "transferred"]).optional(),
        search: z.string().optional(),
        shiftId: z.number().int().positive().optional(),
        // Chỉ superadmin xem được đơn đã xoá mềm — giám sát việc admin xoá,
        // admin (người xoá) không tự xem lại được (xem CLAUDE.md/order.router.ts).
        deleted: z.boolean().optional(),
        // Trang Lịch sử ở /goi-mon/cua-hang set cờ này để CHỈ xem/search trong
        // ca đang mở (không nhận shiftId tuỳ ý từ client) — khác trang admin
        // /quan-ly/don-hang, vẫn xem toàn bộ lịch sử + tự chọn "Số Ca" thủ công
        // như cũ khi không set cờ này.
        currentShiftOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.deleted && ctx.session.user.role !== "superadmin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      let shiftId = input.shiftId;
      if (input.currentShiftOnly) {
        const openShift = await shiftDrizzleRepository.findOpen();
        if (!openShift?.id) return { items: [], total: 0 };
        shiftId = openShift.id;
      }
      const createdBy = ctx.session.user.role === "user" ? ctx.session.user.id : undefined;
      return listOrders(orderDrizzleRepository, { ...input, shiftId, createdBy });
    }),

  // Xoá mềm — admin trở lên xoá được (bất kỳ trạng thái order nào), nhưng
  // KHÔNG tự xem lại được (chỉ superadmin xem qua filter "deleted" ở `list`
  // trên). Ghi vào activity_logs (khác order_events nội bộ) để superadmin
  // giám sát được ai đã xoá đơn nào.
  delete: adminProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteOrder(orderDrizzleRepository, { orderId: input.orderId });
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "order",
        entityId: String(input.orderId),
      });
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
    .query(async ({ ctx, input }) => {
      // Chỉ trang Lịch sử ở /goi-mon/cua-hang gọi endpoint này — luôn giới
      // hạn trong ca đang mở, không có chế độ "xem toàn bộ" (không nhận
      // shiftId từ client).
      const openShift = await shiftDrizzleRepository.findOpen();
      if (!openShift?.id) return { items: [], total: 0 };
      const actorId = ctx.session.user.role === "user" ? ctx.session.user.id : undefined;
      return listOrderItemEvents(orderDrizzleRepository, { ...input, actorId, shiftId: openShift.id });
    }),

  // Lịch sử chuyển bàn ("table_changed") + chuyển món ("items_transferred_out")
  // toàn nhà hàng — trang Lịch sử, tab Chuyển bàn/món. Không lấy
  // "items_transferred_in" (bản ghi đối xứng ở đơn nhận, tránh hiện trùng 2
  // dòng cho cùng 1 lần chuyển). Cùng quy tắc lọc theo actorId khi role "user"
  // như listOrderItemEvents ở trên.
  listTableTransferEvents: userProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Cùng lý do với listOrderItemEvents — luôn giới hạn trong ca đang mở.
      const openShift = await shiftDrizzleRepository.findOpen();
      if (!openShift?.id) return { items: [], total: 0 };
      const actorId = ctx.session.user.role === "user" ? ctx.session.user.id : undefined;
      return listTableTransferEvents(orderDrizzleRepository, {
        ...input,
        actorId,
        shiftId: openShift.id,
      });
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
      await requireKitchenPrinterFor(input.items.map((i) => i.menuItemId), "gọi món");
      try {
        const { order, addedItems } = await addOrderItems(
          orderDrizzleRepository,
          menuItemDrizzleRepository,
          {
            tableId: input.tableId,
            actorId: ctx.session.user.id,
            shiftId,
            items: input.items,
          },
        );
        const orderDetail = order.toDetail();
        const table = await restaurantTableDrizzleRepository.findById(input.tableId);
        const printResult = await printKitchenTicketIfAny(await filterPrintableToKitchen(addedItems), {
          title: "PHIẾU GỌI MÓN",
          orderId: orderDetail.id,
          tableName: table.name,
          staffName: ctx.session.user.name,
          createdAt: new Date(),
        });
        return { ...orderDetail, printResult };
      } catch (error) {
        mapOrderDomainError(error);
      }
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
      const existingOrder = await orderDrizzleRepository.findById(input.orderId);
      if (!existingOrder) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đơn hàng." });
      const affectedItemIds = new Set([...input.changes.map((c) => c.itemId), ...input.removedItemIds]);
      const affectedMenuItemIds = existingOrder.items
        .filter((item) => item.id !== null && affectedItemIds.has(item.id))
        .map((item) => item.menuItemId);
      await requireKitchenPrinterFor(affectedMenuItemIds, "cập nhật món");
      try {
        const { order, addedItems, removedItems } = await updateOrderItems(orderDrizzleRepository, {
          orderId: input.orderId,
          actorId: ctx.session.user.id,
          changes: input.changes,
          removedItemIds: input.removedItemIds,
        });
        const orderDetail = order.toDetail();
        const table = await restaurantTableDrizzleRepository.findById(orderDetail.tableId);
        const baseTicket = {
          orderId: orderDetail.id,
          tableName: table.name,
          staffName: ctx.session.user.name,
          createdAt: new Date(),
        };
        // 1 lần "Xác nhận" có thể vừa gọi thêm vừa trả bớt món cùng lúc — in
        // riêng từng loại phiếu, gộp kết quả in lại làm 1 để UI chỉ hiện 1
        // toast tổng. printKitchenTicketIfAny tự bỏ qua nếu lọc hết sạch món
        // (vd cả lượt gọi/trả chỉ toàn bia, nước ngọt) — không in phiếu trống.
        const [addedResult, removedResult] = await Promise.all([
          printKitchenTicketIfAny(await filterPrintableToKitchen(addedItems), {
            ...baseTicket,
            title: "PHIẾU GỌI MÓN",
          }),
          printKitchenTicketIfAny(await filterPrintableToKitchen(removedItems), {
            ...baseTicket,
            title: "PHIẾU HUỶ MÓN",
          }),
        ]);
        return { ...orderDetail, printResult: [...addedResult, ...removedResult] };
      } catch (error) {
        mapOrderDomainError(error);
      }
    }),

  printBill: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireOpenShift();
      const orderDetail = await runOrderAction(() =>
        printOrder(orderDrizzleRepository, { orderId: input.orderId }),
      );

      // Gửi lệnh in thật là 1 side-effect BEST-EFFORT — lỗi máy in (mất kết
      // nối, hết giấy...) không được throw ở đây, vì printedAt đã set xong
      // và đơn phải tiếp tục thanh toán được bất kể máy in có phản hồi hay
      // không (xem printBillToPrinters/escposBillPrinter). Router tự lắp
      // payload thay vì đưa việc này vào printOrder usecase vì đây là composition
      // xuyên nhiều module (table/payment-config/printer), không phải nghiệp
      // vụ của riêng order.
      const table = await restaurantTableDrizzleRepository.findById(orderDetail.tableId);
      const paymentConfig = await paymentConfigDrizzleRepository.get();
      const payload: BillPrintPayload = {
        ...SHOP_INFO,
        orderId: orderDetail.id,
        tableName: table.name,
        staffName: ctx.session.user.name,
        createdAt: orderDetail.createdAt,
        printedAt: new Date(),
        items: orderDetail.items.map((item) => ({
          itemName: item.itemName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          note: item.note,
        })),
        subtotal: orderDetail.subtotal,
        discountAmount: orderDetail.discountAmount,
        discountLabel: buildDiscountLabel(orderDetail.promotion),
        totalAmount: orderDetail.payableAmount,
        bankCode: paymentConfig?.bankCode ?? null,
        bankAccountNumber: paymentConfig?.bankAccountNumber ?? null,
        bankAccountName: paymentConfig?.bankAccountName ?? null,
        qrImageUrl: paymentConfig
          ? buildVietQrImageUrl(
              paymentConfig.bankCode,
              paymentConfig.bankAccountNumber,
              paymentConfig.bankAccountName,
              orderDetail.payableAmount,
            )
          : null,
      };
      const printResult = await printBillToPrinters(printerDrizzleRepository, escposBillPrinter, payload);

      return { ...orderDetail, printResult };
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
        confirmPayment(orderDrizzleRepository, {
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
        cancelOrder(orderDrizzleRepository, {
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
      const existingOrder = await orderDrizzleRepository.findById(input.orderId);
      if (!existingOrder) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đơn hàng." });
      await requireKitchenPrinterFor(existingOrder.items.map((i) => i.menuItemId), "chuyển bàn");
      try {
        const { order, fromTable, toTable } = await moveOrderTable(
          orderDrizzleRepository,
          restaurantTableDrizzleRepository,
          {
            orderId: input.orderId,
            targetTableId: input.targetTableId,
            actorId: ctx.session.user.id,
          },
        );
        const orderDetail = order.toDetail();
        const printResult = await printKitchenTicketIfAny(await filterPrintableToKitchen(orderDetail.items), {
          title: "PHIẾU CHUYỂN BÀN",
          orderId: orderDetail.id,
          tableName: toTable.name,
          staffName: ctx.session.user.name,
          createdAt: new Date(),
          transferInfo: `${fromTable ? fromTable.name : "?"} -> ${toTable.name}`,
        });
        return { ...orderDetail, printResult };
      } catch (error) {
        mapOrderDomainError(error);
      }
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
      const sourceOrder = await orderDrizzleRepository.findById(input.sourceOrderId);
      if (!sourceOrder) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đơn hàng." });
      const transferItemIds = new Set(input.items.map((i) => i.itemId));
      const affectedMenuItemIds = sourceOrder.items
        .filter((item) => item.id !== null && transferItemIds.has(item.id))
        .map((item) => item.menuItemId);
      await requireKitchenPrinterFor(affectedMenuItemIds, "chuyển món");
      try {
        const { source, target, transferredItems, sourceTableName, targetTableName } = await transferOrderItems(
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
        const targetDetail = target.toDetail();
        const targetTable = await restaurantTableDrizzleRepository.findById(input.targetTableId);
        const printResult = await printKitchenTicketIfAny(await filterPrintableToKitchen(transferredItems), {
          title: "PHIẾU CHUYỂN MÓN",
          orderId: targetDetail.id,
          tableName: targetTable.name,
          staffName: ctx.session.user.name,
          createdAt: new Date(),
          transferInfo: `${sourceTableName} -> ${targetTableName}`,
        });
        return { source: source?.toDetail() ?? null, target: targetDetail, printResult };
      } catch (error) {
        mapOrderDomainError(error);
      }
    }),

  // Gộp NGUYÊN đơn đang mở ở bàn này vào đơn đang mở SẴN ở bàn đích (khách
  // ghép bàn) — bàn đích bắt buộc đã có đơn đang mở, khác transferItems
  // (chuyển từng phần món, bàn đích có thể đang trống).
  mergeOrders: userProcedure
    .input(
      z.object({
        sourceOrderId: z.number().int().positive(),
        targetTableId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOpenShift();
      try {
        const { source, target } = await mergeOrders(
          orderDrizzleRepository,
          restaurantTableDrizzleRepository,
          {
            sourceOrderId: input.sourceOrderId,
            targetTableId: input.targetTableId,
            actorId: ctx.session.user.id,
          },
        );
        return { source: source.toDetail(), target: target.toDetail() };
      } catch (error) {
        mapOrderDomainError(error);
      }
    }),
});
