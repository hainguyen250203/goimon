import type { OrderStatus } from "~/modules/order/domain/order-list-item.entity";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  open: "Đang mở",
  paid: "Đã thanh toán",
  cancelled: "Đã huỷ",
};

export const STATUS_DOT_COLOR: Record<OrderStatus, string> = {
  open: "gray.400",
  paid: "green.500",
  cancelled: "red.500",
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
