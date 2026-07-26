import type { OrderRepository, OrderTimelineEvent } from "../domain/order.repository";

export async function getOrderTimeline(
  repository: OrderRepository,
  orderId: number,
): Promise<OrderTimelineEvent[]> {
  return repository.getOrderTimeline(orderId);
}
