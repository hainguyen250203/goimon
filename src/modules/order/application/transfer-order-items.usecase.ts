import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
import { InvalidTableTransferError, OrderItemNotFoundError } from "../domain/order.errors";
import { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type TransferOrderItemsParams = {
  sourceOrderId: number;
  /** quantity = số lượng MUỐN CHUYỂN, có thể nhỏ hơn số lượng hiện có của dòng đó (tách dòng). */
  items: { itemId: number; quantity: number }[];
  targetTableId: number;
  actorId: string;
  /** Để mở order mới ở bàn đích nếu bàn đó đang trống — giống add-order-items.usecase.ts. */
  shiftId: number;
};

export type TransferOrderItemsResult = {
  /** null nếu đơn nguồn hết món sau khi chuyển (tự "transferred" — xem Order.removeItem()). */
  source: Order | null;
  target: Order;
};

/**
 * Chuyển 1 phần món (1 hoặc nhiều order_item, có thể chỉ 1 phần số lượng) từ
 * đơn đang mở ở bàn này sang order_id của bàn khác — gộp vào đơn đang mở sẵn
 * ở bàn đích (addItem() tự gộp nếu cùng món+note), hoặc tự mở đơn mới nếu bàn
 * đích đang trống. Khác move-order-table.usecase.ts (chuyển NGUYÊN đơn sang
 * bàn TRỐNG) — task này chuyển từng món, đơn nguồn vẫn tiếp tục tồn tại.
 */
export async function transferOrderItems(
  orderRepository: OrderRepository,
  tableRepository: RestaurantTableRepository,
  params: TransferOrderItemsParams,
): Promise<TransferOrderItemsResult> {
  const sourceOrder = await orderRepository.findById(params.sourceOrderId);
  if (!sourceOrder) throw new Error("Không tìm thấy đơn nguồn.");

  if (sourceOrder.tableId === params.targetTableId) {
    throw new InvalidTableTransferError("Bàn đích trùng với bàn nguồn.");
  }

  // Snapshot + validate TRƯỚC khi mutate gì cả.
  const itemById = new Map(sourceOrder.items.map((item) => [item.id, item]));
  const moves = params.items.map(({ itemId, quantity }) => {
    const item = itemById.get(itemId);
    if (!item) throw new OrderItemNotFoundError(itemId);
    if (quantity > item.quantity) {
      throw new InvalidTableTransferError(
        `Số lượng chuyển của "${item.itemName}" vượt quá số lượng hiện có.`,
      );
    }
    return { item, quantity };
  });

  let targetOrder = await orderRepository.findActiveByTableId(params.targetTableId);
  const isNewTargetOrder = targetOrder === null;
  if (!targetOrder) {
    targetOrder = Order.open(params.targetTableId, params.actorId, params.shiftId);
  }

  // Add trước, remove sau — add throw giữa chừng (không nên xảy ra vì cả 2
  // đơn đều đã qua assertMutable ở trên) thì đơn nguồn vẫn chưa bị đụng.
  for (const { item, quantity } of moves) {
    targetOrder.addItem(
      { id: item.menuItemId, name: item.itemName, price: item.unitPrice },
      quantity,
      item.note,
    );
  }
  for (const { item, quantity } of moves) {
    const remaining = item.quantity - quantity;
    if (remaining > 0) {
      sourceOrder.updateItemQuantity(item.id!, remaining);
    } else {
      sourceOrder.removeItem(item.id!, "transferred");
    }
  }

  const savedTarget = await orderRepository.save(targetOrder);
  const sourceBecameEmpty = sourceOrder.status === "transferred";
  const savedSource = await orderRepository.save(sourceOrder);

  if (isNewTargetOrder) {
    await tableRepository.setStatus(params.targetTableId, "occupied");
  }
  if (sourceBecameEmpty) {
    await tableRepository.setStatus(savedSource.tableId, "available");
  }

  const tables = await tableRepository.listAll();
  const sourceTableName = tables.find((t) => t.id === savedSource.tableId)?.name ?? "";
  const targetTableName = tables.find((t) => t.id === params.targetTableId)?.name ?? "";

  const transferredItems = moves.map(({ item, quantity }) => ({
    itemName: item.itemName,
    unitPrice: item.unitPrice,
    quantity,
    note: item.note,
  }));

  await orderRepository.recordEvent({
    orderId: savedSource.id!,
    actorId: params.actorId,
    eventType: "items_transferred_out",
    payload: { items: transferredItems, toTableId: params.targetTableId, toTableName: targetTableName },
  });
  await orderRepository.recordEvent({
    orderId: savedTarget.id!,
    actorId: params.actorId,
    eventType: "items_transferred_in",
    payload: { items: transferredItems, fromTableId: savedSource.tableId, fromTableName: sourceTableName },
  });
  // Chuyển hết món tự chuyển đơn nguồn sang "transferred" (KHÁC "cancelled"
  // — không mất gì, chỉ chuyển đơn) — ghi mốc đóng đơn riêng, không dùng
  // chung eventType "order_cancelled" kẻo lịch sử hiện nhầm thành "Huỷ đơn".
  if (sourceBecameEmpty) {
    await orderRepository.recordEvent({
      orderId: savedSource.id!,
      actorId: params.actorId,
      eventType: "order_transferred",
    });
  }

  return { source: sourceBecameEmpty ? null : savedSource, target: savedTarget };
}
