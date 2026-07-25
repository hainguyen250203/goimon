import type { MenuItemRepository } from "~/modules/menu/domain/menu-item.repository";
import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
import { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type AddOrderItemsParams = {
  tableId: number;
  actorId: string;
  items: { menuItemId: number; quantity: number; note?: string | null }[];
};

/**
 * Mở order mới cho bàn nếu chưa có (hoặc dùng order "open"/"printed" đang có),
 * thêm/gộp các món vào — giá/tên lấy từ menu thật (KHÔNG tin client) để
 * tránh gian lận giá. Nếu order mới mở, tự chuyển bàn sang "occupied".
 */
export async function addOrderItems(
  orderRepository: OrderRepository,
  tableRepository: RestaurantTableRepository,
  menuItemRepository: MenuItemRepository,
  params: AddOrderItemsParams,
): Promise<Order> {
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
    orderEntity = Order.open(params.tableId, params.actorId);
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

  await orderRepository.recordEvent({
    orderId: saved.id!,
    actorId: params.actorId,
    eventType: "items_added",
    payload: {
      items: params.items.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
      })),
    },
  });

  return saved;
}
