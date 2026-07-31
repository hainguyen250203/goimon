import type { OrderRepository } from "../domain/order.repository";

export type DeleteOrderParams = {
  orderId: number;
};

export async function deleteOrder(
  repository: OrderRepository,
  { orderId }: DeleteOrderParams,
): Promise<void> {
  return repository.softDeleteOrder(orderId);
}
