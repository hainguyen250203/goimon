import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type CancelOrderParams = {
  orderId: number;
  actorId: string;
};

export async function cancelOrder(
  orderRepository: OrderRepository,
  tableRepository: RestaurantTableRepository,
  params: CancelOrderParams,
): Promise<Order> {
  const orderEntity = await orderRepository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  orderEntity.cancel();

  const saved = await orderRepository.save(orderEntity);
  await tableRepository.setStatus(saved.tableId, "available");
  await orderRepository.recordEvent({
    orderId: saved.id!,
    actorId: params.actorId,
    eventType: "order_cancelled",
  });
  return saved;
}
