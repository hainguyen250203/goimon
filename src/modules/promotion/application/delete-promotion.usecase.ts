import type { PromotionRepository } from "../domain/promotion.repository";

export async function deletePromotion(
  repository: PromotionRepository,
  id: number,
): Promise<void> {
  return repository.remove(id);
}
