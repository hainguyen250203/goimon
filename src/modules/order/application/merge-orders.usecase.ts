import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
import { InvalidTableTransferError } from "../domain/order.errors";
import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type MergeOrdersParams = {
  sourceOrderId: number;
  targetTableId: number;
  actorId: string;
};

export type MergeOrdersResult = {
  /** Đơn nguồn LUÔN hết món sau khi gộp — tự "cancelled" (xem Order.removeItem()). */
  source: Order;
  target: Order;
};

/**
 * Gộp NGUYÊN đơn đang mở ở bàn này vào đơn đang mở SẴN ở bàn đích (khách ghép
 * bàn) — khác transfer-order-items.usecase.ts (chuyển 1 PHẦN món, đơn nguồn
 * có thể vẫn còn tồn tại) và move-order-table.usecase.ts (chuyển nguyên đơn
 * sang bàn TRỐNG). Ở đây bàn đích BẮT BUỘC đã có đơn đang mở — nếu bàn đích
 * đang trống thì đây không phải "gộp", dùng moveTable thay thế.
 */
export async function mergeOrders(
  orderRepository: OrderRepository,
  tableRepository: RestaurantTableRepository,
  params: MergeOrdersParams,
): Promise<MergeOrdersResult> {
  const sourceOrder = await orderRepository.findById(params.sourceOrderId);
  if (!sourceOrder) throw new Error("Không tìm thấy đơn nguồn.");

  if (sourceOrder.tableId === params.targetTableId) {
    throw new InvalidTableTransferError("Bàn đích trùng với bàn nguồn.");
  }
  if (sourceOrder.items.length === 0) {
    throw new InvalidTableTransferError("Đơn nguồn không có món nào để gộp.");
  }

  const targetOrder = await orderRepository.findActiveByTableId(params.targetTableId);
  if (!targetOrder) {
    throw new InvalidTableTransferError(
      'Bàn đích chưa có đơn nào đang mở — dùng "Chuyển bàn" thay vì gộp đơn.',
    );
  }

  // Snapshot TRƯỚC khi mutate — add hết sang đích trước, remove sạch nguồn
  // sau (nếu addItem lỡ throw giữa chừng thì đơn nguồn vẫn chưa bị đụng).
  const movedItems = sourceOrder.items.map((item) => ({
    itemName: item.itemName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    note: item.note,
  }));

  for (const item of sourceOrder.items) {
    targetOrder.addItem(
      { id: item.menuItemId, name: item.itemName, price: item.unitPrice },
      item.quantity,
      item.note,
    );
  }
  for (const item of [...sourceOrder.items]) {
    sourceOrder.removeItem(item.id!);
  }

  const savedTarget = await orderRepository.save(targetOrder);
  const savedSource = await orderRepository.save(sourceOrder);

  await tableRepository.setStatus(savedSource.tableId, "available");

  const tables = await tableRepository.listAll();
  const sourceTableName = tables.find((t) => t.id === savedSource.tableId)?.name ?? "";
  const targetTableName = tables.find((t) => t.id === params.targetTableId)?.name ?? "";

  // Tái dùng đúng eventType của transfer-order-items — về bản chất gộp đơn
  // là chuyển TOÀN BỘ món, timeline UI (order-timeline.tsx) đã biết diễn giải
  // 2 loại event này, không cần thêm eventType mới.
  await orderRepository.recordEvent({
    orderId: savedSource.id!,
    actorId: params.actorId,
    eventType: "items_transferred_out",
    payload: { items: movedItems, toTableId: params.targetTableId, toTableName: targetTableName },
  });
  await orderRepository.recordEvent({
    orderId: savedTarget.id!,
    actorId: params.actorId,
    eventType: "items_transferred_in",
    payload: { items: movedItems, fromTableId: savedSource.tableId, fromTableName: sourceTableName },
  });
  // Gộp đơn LUÔN chuyển hết món đi nên đơn nguồn luôn "cancelled" — ghi thêm
  // mốc đóng đơn rõ ràng, giống hệt lúc huỷ tay, để lịch sử không dừng lại
  // đột ngột ở dòng "Chuyển món sang X" mà không rõ đơn đã đóng.
  await orderRepository.recordEvent({
    orderId: savedSource.id!,
    actorId: params.actorId,
    eventType: "order_cancelled",
  });

  return { source: savedSource, target: savedTarget };
}
