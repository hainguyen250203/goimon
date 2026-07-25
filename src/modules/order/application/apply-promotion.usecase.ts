import type { PromotionRepository } from "~/modules/promotion/domain/promotion.repository";
import { PromotionNotAvailableError } from "../domain/order.errors";
import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type ApplyPromotionParams = {
  orderId: number;
  promotionId: number;
  actorId: string;
};

export async function applyPromotion(
  repository: OrderRepository,
  promotionRepository: PromotionRepository,
  params: ApplyPromotionParams,
): Promise<Order> {
  const orderEntity = await repository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  const promotion = await promotionRepository.findById(params.promotionId);
  if (!promotion || !promotion.isActive) throw new PromotionNotAvailableError();

  orderEntity.applyPromotion(promotion);

  const saved = await repository.save(orderEntity);
  await repository.recordEvent({
    orderId: saved.id!,
    actorId: params.actorId,
    eventType: "promotion_applied",
    payload: { promotionId: promotion.id, name: promotion.name },
  });
  return saved;
}
