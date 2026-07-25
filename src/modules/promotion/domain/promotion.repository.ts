import type { Promotion } from "./promotion.entity";

export type ListPromotionsParams = {
  page: number;
  pageSize: number;
  isActive?: boolean;
};

export type ListPromotionsResult = {
  items: Promotion[];
  total: number;
};

export type CreatePromotionParams = {
  name: string;
  discountType: Promotion["discountType"];
  discountValue: number;
  isActive: boolean;
};

export type UpdatePromotionParams = CreatePromotionParams & { id: number };

export interface PromotionRepository {
  list(params: ListPromotionsParams): Promise<ListPromotionsResult>;
  /** Chỉ khuyến mãi đang bật — cho picker ở màn hình gọi món. */
  listActive(): Promise<Promotion[]>;
  findById(id: number): Promise<Promotion | null>;
  create(params: CreatePromotionParams): Promise<Promotion>;
  update(params: UpdatePromotionParams): Promise<Promotion>;
  /** orders.promotion_id có onDelete "set null" — xoá không phá dữ liệu đơn cũ (đã snapshot tên/loại/giá trị giảm). */
  remove(id: number): Promise<void>;
}
