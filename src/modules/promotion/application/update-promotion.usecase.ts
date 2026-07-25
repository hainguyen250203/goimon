import type {
  PromotionRepository,
  UpdatePromotionParams,
} from "../domain/promotion.repository";
import type { Promotion } from "../domain/promotion.entity";

export async function updatePromotion(
  repository: PromotionRepository,
  params: UpdatePromotionParams,
): Promise<Promotion> {
  return repository.update(params);
}
