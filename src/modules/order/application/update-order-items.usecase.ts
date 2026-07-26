import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
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
 * lần bấm, nên usecase cũng gom thành 1 lần load/save duy nhất.
 *
 * Ghi event: xoá món và sửa số lượng là 2 hành động nghiệp vụ khác nhau nên
 * ghi 2 event_type riêng (items_removed / items_quantity_updated) thay vì 1
 * event "items_batch_updated" gộp chung ID thô — giống items_added, resolve
 * sẵn tên món tại thời điểm xảy ra (order_item có thể đã bị xoá khỏi DB sau
 * đó) để trang Lịch sử gọi món hiển thị/tìm kiếm được mà không cần join lại.
 * Chỉ ghi event khi hành động đó thực sự xảy ra (mảng tương ứng không rỗng).
 *
 * Xoá hết món (đơn về 0 món): order.entity tự chuyển status sang "cancelled"
 * (xem removeItem()) — usecase chỉ cần trả bàn về "available" giống luồng
 * cancelOrder, vì bàn không thể "đang phục vụ" với đơn rỗng/đã huỷ.
 */
export async function updateOrderItems(
  orderRepository: OrderRepository,
  tableRepository: RestaurantTableRepository,
  params: UpdateOrderItemsParams,
): Promise<Order> {
  const orderEntity = await orderRepository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  // Snapshot tên/giá/số lượng TRƯỚC khi mutate — sau removeItem() dòng này
  // không còn trong orderEntity.items nữa.
  const itemById = new Map(orderEntity.items.map((item) => [item.id, item]));
  const removedItems = params.removedItemIds
    .map((id) => itemById.get(id))
    .filter((item): item is NonNullable<typeof item> => item != null)
    .map((item) => ({ itemName: item.itemName, unitPrice: item.unitPrice, quantity: item.quantity }));
  const quantityChanges = params.changes
    .map((change) => {
      const item = itemById.get(change.itemId);
      return item ? { itemName: item.itemName, oldQuantity: item.quantity, newQuantity: change.quantity } : null;
    })
    .filter((change): change is NonNullable<typeof change> => change != null);

  for (const itemId of params.removedItemIds) {
    orderEntity.removeItem(itemId);
  }
  for (const change of params.changes) {
    orderEntity.updateItemQuantity(change.itemId, change.quantity);
  }

  const saved = await orderRepository.save(orderEntity);

  if (saved.status === "cancelled") {
    await tableRepository.setStatus(saved.tableId, "available");
  }

  if (removedItems.length > 0) {
    await orderRepository.recordEvent({
      orderId: saved.id!,
      actorId: params.actorId,
      eventType: "items_removed",
      payload: { items: removedItems },
      itemsSummary: removedItems.map((i) => `${i.itemName} ×${i.quantity}`).join(", "),
    });
  }
  if (quantityChanges.length > 0) {
    await orderRepository.recordEvent({
      orderId: saved.id!,
      actorId: params.actorId,
      eventType: "items_quantity_updated",
      payload: { items: quantityChanges },
    });
  }

  return saved;
}
