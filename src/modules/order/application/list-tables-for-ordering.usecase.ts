import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
import type { TableForOrdering } from "~/modules/table/domain/restaurant-table.entity";
import type { OrderRepository } from "../domain/order.repository";

/**
 * Ghép bàn (table module) với order đang hoạt động (order module) ở tầng
 * usecase — tránh table module phải import schema của order module (sẽ tạo
 * circular import vì order.schema.ts đã import ngược lại table.schema.ts).
 */
export async function listTablesForOrdering(
  tableRepository: RestaurantTableRepository,
  orderRepository: OrderRepository,
): Promise<TableForOrdering[]> {
  const [tables, activeOrders] = await Promise.all([
    tableRepository.listAll(),
    orderRepository.listActive(),
  ]);
  const activeByTableId = new Map(activeOrders.map((o) => [o.tableId, o]));

  return tables.map((table) => {
    const active = activeByTableId.get(table.id);
    return {
      ...table,
      activeOrder: active
        ? { id: active.orderId, subtotal: active.subtotal, createdAt: active.createdAt }
        : null,
    };
  });
}
