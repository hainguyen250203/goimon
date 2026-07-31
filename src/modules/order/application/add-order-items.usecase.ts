import type { MenuItemRepository } from "~/modules/menu/domain/menu-item.repository";
import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
import { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type AddOrderItemsParams = {
  tableId: number;
  actorId: string;
  /** Ca đang mở — gắn vào order mới nếu bàn chưa có order active. */
  shiftId: number;
  items: { menuItemId: number; quantity: number; note?: string | null }[];
};

export type AddOrderItemsResult = {
  order: Order;
  /** Đúng các món vừa gọi thêm (không phải toàn bộ đơn) — dùng in phiếu bếp
   * "PHIẾU GỌI MÓN". `menuItemId` để router lọc theo `printToKitchen` trước
   * khi in — xem order.router.ts. */
  addedItems: { menuItemId: number; itemName: string; quantity: number; note: string | null }[];
};

/**
 * Mở order mới cho bàn nếu chưa có (hoặc dùng order "open" đang có),
 * thêm/gộp các món vào — giá/tên lấy từ menu thật (KHÔNG tin client) để
 * tránh gian lận giá. Nếu order mới mở, tự chuyển bàn sang "occupied".
 */
export async function addOrderItems(
  orderRepository: OrderRepository,
  tableRepository: RestaurantTableRepository,
  menuItemRepository: MenuItemRepository,
  params: AddOrderItemsParams,
): Promise<AddOrderItemsResult> {
  if (params.items.length === 0) {
    throw new Error("Chưa chọn món nào.");
  }

  const menuItems = await menuItemRepository.findByIds(
    params.items.map((i) => i.menuItemId),
  );
  const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

  let orderEntity = await orderRepository.findActiveByTableId(params.tableId);
  const isNewOrder = orderEntity === null;
  if (!orderEntity) {
    orderEntity = Order.open(params.tableId, params.actorId, params.shiftId);
  }

  for (const line of params.items) {
    const menuItem = menuItemById.get(line.menuItemId);
    if (!menuItem) {
      throw new Error(`Không tìm thấy món ăn id ${line.menuItemId}.`);
    }
    orderEntity.addItem(
      { id: menuItem.id, name: menuItem.name, price: menuItem.price },
      line.quantity,
      line.note,
    );
  }

  const saved = await orderRepository.save(orderEntity);

  if (isNewOrder) {
    await tableRepository.setStatus(params.tableId, "occupied");
  }

  // Snapshot tên món thật vào payload + items_summary (text phẳng) — không
  // suy ngược từ menuItemId lúc hiển thị lịch sử, vì menu item có thể đổi
  // tên/bị xoá sau đó (giống cách order_items snapshot itemName/unitPrice).
  const resolvedItems = params.items.map((i) => {
    const menuItem = menuItemById.get(i.menuItemId)!;
    return {
      menuItemId: menuItem.id,
      itemName: menuItem.name,
      unitPrice: menuItem.price,
      quantity: i.quantity,
      note: i.note ?? null,
    };
  });

  await orderRepository.recordEvent({
    orderId: saved.id!,
    actorId: params.actorId,
    eventType: "items_added",
    payload: { items: resolvedItems },
    itemsSummary: resolvedItems.map((i) => `${i.itemName} ×${i.quantity}`).join(", "),
  });

  return {
    order: saved,
    addedItems: resolvedItems.map((i) => ({
      menuItemId: i.menuItemId,
      itemName: i.itemName,
      quantity: i.quantity,
      note: i.note,
    })),
  };
}
