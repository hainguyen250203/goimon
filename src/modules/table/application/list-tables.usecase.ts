import type { OrderRepository } from "~/modules/order/domain/order.repository";
import type { RestaurantTable } from "../domain/restaurant-table.entity";
import type { ListTablesParams, RestaurantTableRepository } from "../domain/restaurant-table.repository";

export type TableOccupancyStatus = "available" | "occupied";

/** "status" ở đây LUÔN suy từ order đang mở (activeOrder), không phải field
 * lưu sẵn trên entity — chỉ tồn tại ở kết quả usecase này. */
export type RestaurantTableWithStatus = RestaurantTable & { status: TableOccupancyStatus };

export type ListTablesWithStatusParams = Omit<ListTablesParams, "tableIdIn" | "tableIdNotIn"> & {
  status?: TableOccupancyStatus;
};

export type ListTablesWithStatusResult = {
  items: RestaurantTableWithStatus[];
  total: number;
};

/**
 * Ghép bàn (table module) với order đang mở (order module) ở tầng usecase —
 * cùng pattern order/application/list-tables-for-ordering.usecase.ts (tránh
 * table module phải import schema của order module, gây circular import).
 * Khác usecase đó ở chỗ có phân trang + filter theo status suy ra: dịch
 * status="occupied"/"available" thành tableIdIn/tableIdNotIn trước khi gọi
 * tableRepository.list(), vì repository không biết khái niệm "order".
 */
export async function listTables(
  tableRepository: RestaurantTableRepository,
  orderRepository: OrderRepository,
  { status, ...params }: ListTablesWithStatusParams,
): Promise<ListTablesWithStatusResult> {
  const activeOrders = await orderRepository.listActive();
  const occupiedTableIds = activeOrders.map((o) => o.tableId);
  const occupiedSet = new Set(occupiedTableIds);

  const { items, total } = await tableRepository.list({
    ...params,
    tableIdIn: status === "occupied" ? occupiedTableIds : undefined,
    tableIdNotIn: status === "available" ? occupiedTableIds : undefined,
  });

  return {
    items: items.map((table) => ({
      ...table,
      status: occupiedSet.has(table.id) ? "occupied" : ("available" as TableOccupancyStatus),
    })),
    total,
  };
}
