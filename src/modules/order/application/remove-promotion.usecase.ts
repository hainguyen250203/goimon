import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type RemovePromotionParams = {
  orderId: number;
  actorId: string;
};

export async function removePromotion(
  repository: OrderRepository,
  params: RemovePromotionParams,
): Promise<Order> {
  const orderEntity = await repository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  orderEntity.removePromotion();

  const saved = await repository.save(orderEntity);
  await repository.recordEvent({
    orderId: saved.id!,
    actorId: params.actorId,
    eventType: "promotion_removed",
  });
  return saved;
}
