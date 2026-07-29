import type {
  PromotionRepository,
  UpdatePromotionParams,
} from "../domain/promotion.repository";
import type { Promotion } from "../domain/promotion.entity";

export type UpdatePromotionResult = {
  before: Promotion;
  after: Promotion;
};

export async function updatePromotion(
  repository: PromotionRepository,
  params: UpdatePromotionParams,
): Promise<UpdatePromotionResult> {
  const before = await repository.findById(params.id);
  if (!before) throw new Error("Không tìm thấy khuyến mãi.");
  const after = await repository.update(params);
  return { before, after };
}
