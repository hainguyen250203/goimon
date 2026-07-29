import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

/** Order đang "open" của 1 bàn, hoặc null nếu bàn chưa gọi món. */
export async function getTableOrder(
  repository: OrderRepository,
  tableId: number,
): Promise<Order | null> {
  return repository.findActiveByTableId(tableId);
}
