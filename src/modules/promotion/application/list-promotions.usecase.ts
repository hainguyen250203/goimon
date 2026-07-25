import type {
  ListPromotionsParams,
  ListPromotionsResult,
  PromotionRepository,
} from "../domain/promotion.repository";

export async function listPromotions(
  repository: PromotionRepository,
  params: ListPromotionsParams,
): Promise<ListPromotionsResult> {
  return repository.list(params);
}
