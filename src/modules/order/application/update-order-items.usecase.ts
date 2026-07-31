import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type UpdateOrderItemsParams = {
  orderId: number;
  actorId: string;
  changes: { itemId: number; quantity: number }[];
  removedItemIds: number[];
};

export type UpdateOrderItemsResult = {
  order: Order;
  /** Món tăng số lượng (gọi thêm) — in "PHIẾU GỌI MÓN" nếu không rỗng.
   * `menuItemId` để router lọc theo `printToKitchen` trước khi in. */
  addedItems: { menuItemId: number; itemName: string; quantity: number; note: string | null }[];
  /** Món xoá hẳn/giảm số lượng (trả bớt) — in "PHIẾU HUỶ MÓN" nếu không rỗng. */
  removedItems: { menuItemId: number; itemName: string; quantity: number; note: string | null }[];
};

/**
 * Lưu một loạt thay đổi (sửa số lượng + xoá món) trong 1 lần "Xác nhận" ở
 * màn hình Món đã gọi — UI gom sửa cục bộ rồi gọi 1 lần thay vì lưu ngay mỗi
 * lần bấm, nên usecase cũng gom thành 1 lần load/save duy nhất.
 *
 * Ghi event: với người dùng, TĂNG số lượng 1 món đã gọi bản chất là "gọi
 * thêm" món đó, và GIẢM số lượng bản chất là "trả bớt" — nên phần chênh
 * lệch số lượng được gộp thẳng vào cùng event_type items_added/items_removed
 * (cùng loại với xoá hẳn 1 món), KHÔNG tách thành 1 event_type riêng
 * "items_quantity_updated" như trước — nếu không, tăng/giảm số lượng sẽ
 * "biến mất" khỏi trang Lịch sử gọi món (trang đó chỉ lọc items_added/
 * items_removed) dù về bản chất nghiệp vụ đó đúng là gọi thêm/trả bớt món.
 * Resolve sẵn tên món tại thời điểm xảy ra (order_item có thể đã bị xoá khỏi
 * DB sau đó) để trang Lịch sử gọi món hiển thị/tìm kiếm được mà không cần
 * join lại. Chỉ ghi event khi hành động đó thực sự xảy ra (mảng không rỗng).
 *
 * Xoá hết món (đơn về 0 món) ở đây KHÔNG tự huỷ đơn — coi như "trả hết
 * món", đơn vẫn "open", bàn vẫn đang phục vụ (xem Order.removeItem()). Chỉ
 * bấm "Huỷ đơn" (cancel-order.usecase.ts) mới thật sự đóng đơn/trả bàn.
 */
export async function updateOrderItems(
  orderRepository: OrderRepository,
  params: UpdateOrderItemsParams,
): Promise<UpdateOrderItemsResult> {
  const orderEntity = await orderRepository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  // Snapshot tên/giá/số lượng TRƯỚC khi mutate — sau removeItem() dòng này
  // không còn trong orderEntity.items nữa.
  const itemById = new Map(orderEntity.items.map((item) => [item.id, item]));

  const removedItems = params.removedItemIds
    .map((id) => itemById.get(id))
    .filter((item): item is NonNullable<typeof item> => item != null)
    .map((item) => ({
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      note: item.note,
    }));

  // Chênh lệch số lượng: dương = gọi thêm (cộng vào items_added), âm = trả
  // bớt (cộng vào items_removed) — không phát sinh event nếu số lượng không đổi.
  const addedFromQuantityChange: typeof removedItems = [];
  const removedFromQuantityChange: typeof removedItems = [];
  for (const change of params.changes) {
    const item = itemById.get(change.itemId);
    if (!item) continue;
    const delta = change.quantity - item.quantity;
    if (delta > 0) {
      addedFromQuantityChange.push({
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        quantity: delta,
        note: item.note,
      });
    } else if (delta < 0) {
      removedFromQuantityChange.push({
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        quantity: -delta,
        note: item.note,
      });
    }
  }

  for (const itemId of params.removedItemIds) {
    orderEntity.removeItem(itemId);
  }
  for (const change of params.changes) {
    orderEntity.updateItemQuantity(change.itemId, change.quantity);
  }

  const saved = await orderRepository.save(orderEntity);

  const allRemoved = [...removedItems, ...removedFromQuantityChange];
  const allAdded = addedFromQuantityChange;

  if (allRemoved.length > 0) {
    await orderRepository.recordEvent({
      orderId: saved.id!,
      actorId: params.actorId,
      eventType: "items_removed",
      payload: { items: allRemoved },
      itemsSummary: allRemoved.map((i) => `${i.itemName} ×${i.quantity}`).join(", "),
    });
  }
  if (allAdded.length > 0) {
    await orderRepository.recordEvent({
      orderId: saved.id!,
      actorId: params.actorId,
      eventType: "items_added",
      payload: { items: allAdded },
      itemsSummary: allAdded.map((i) => `${i.itemName} ×${i.quantity}`).join(", "),
    });
  }

  const toKitchenItem = (i: (typeof allAdded)[number]) => ({
    menuItemId: i.menuItemId,
    itemName: i.itemName,
    quantity: i.quantity,
    note: i.note,
  });

  return {
    order: saved,
    addedItems: allAdded.map(toKitchenItem),
    removedItems: allRemoved.map(toKitchenItem),
  };
}
