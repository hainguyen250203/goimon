import type {
  CreatePromotionParams,
  PromotionRepository,
} from "../domain/promotion.repository";
import type { Promotion } from "../domain/promotion.entity";

export async function createPromotion(
  repository: PromotionRepository,
  params: CreatePromotionParams,
): Promise<Promotion> {
  return repository.create(params);
}
