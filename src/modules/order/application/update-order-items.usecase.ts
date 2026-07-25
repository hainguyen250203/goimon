import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type UpdateOrderItemsParams = {
  orderId: number;
  actorId: string;
  changes: { itemId: number; quantity: number }[];
  removedItemIds: number[];
};

/**
 * Lưu một loạt thay đổi (sửa số lượng + xoá món) trong 1 lần "Xác nhận" ở
 * màn hình Món đã gọi — UI gom sửa cục bộ rồi gọi 1 lần thay vì lưu ngay mỗi
 * lần bấm, nên usecase cũng gom thành 1 lần load/save/ghi event duy nhất.
 */
export async function updateOrderItems(
  repository: OrderRepository,
  params: UpdateOrderItemsParams,
): Promise<Order> {
  const orderEntity = await repository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  for (const itemId of params.removedItemIds) {
    orderEntity.removeItem(itemId);
  }
  for (const change of params.changes) {
    orderEntity.updateItemQuantity(change.itemId, change.quantity);
  }

  const saved = await repository.save(orderEntity);
  await repository.recordEvent({
    orderId: saved.id!,
    actorId: params.actorId,
    eventType: "items_batch_updated",
    payload: { changes: params.changes, removedItemIds: params.removedItemIds },
  });
  return saved;
}
