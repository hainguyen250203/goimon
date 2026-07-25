export type DiscountType = "percent" | "fixed";

export type Promotion = {
  id: number;
  name: string;
  discountType: DiscountType;
  // percent: 1-100 (%); fixed: số tiền VNĐ cố định.
  discountValue: number;
  isActive: boolean;
};
