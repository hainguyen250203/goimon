import type { Promotion } from "../domain/promotion.entity";
import type { PromotionRepository } from "../domain/promotion.repository";

export async function listActivePromotions(
  repository: PromotionRepository,
): Promise<Promotion[]> {
  return repository.listActive();
}
