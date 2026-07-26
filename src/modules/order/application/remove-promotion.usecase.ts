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

  // Snapshot khuyến mãi TRƯỚC khi gỡ — giống promotion_applied, ghi rõ đã gỡ
  // khuyến mãi nào thay vì chỉ ghi "đã gỡ" chung chung không rõ nội dung.
  const removedPromotion = orderEntity.promotion;
  orderEntity.removePromotion();

  const saved = await repository.save(orderEntity);
  if (removedPromotion) {
    await repository.recordEvent({
      orderId: saved.id!,
      actorId: params.actorId,
      eventType: "promotion_removed",
      payload: { promotionId: removedPromotion.id, name: removedPromotion.name },
    });
  }
  return saved;
}
