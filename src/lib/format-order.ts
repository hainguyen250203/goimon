import type { OrderStatus } from "~/modules/order/domain/order-list-item.entity";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  open: "Đang mở",
  paid: "Đã thanh toán",
  cancelled: "Đã huỷ",
  transferred: "Đã chuyển hết",
};

// "transferred" cố tình KHÁC màu "open" (trước đây trùng gray.400, nhìn
// không phân biệt được đơn đang mở thật hay đã đóng vì chuyển hết món) và
// khác cả "cancelled" (đỏ — mất thật) vì đây không mất gì, chỉ chuyển đơn.
export const STATUS_DOT_COLOR: Record<OrderStatus, string> = {
  open: "gray.400",
  paid: "green.500",
  cancelled: "red.500",
  transferred: "purple.500",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};

export function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatDiscount(promotion: { discountType: "percent" | "fixed"; discountValue: number }) {
  return promotion.discountType === "percent"
    ? `${promotion.discountValue}%`
    : formatVnd(promotion.discountValue);
}
