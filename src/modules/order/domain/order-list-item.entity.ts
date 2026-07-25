export type OrderStatus = "open" | "printed" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "transfer";

/**
 * Read model cho trang danh sách đơn hàng (chỉ hiển thị). KHÔNG phải entity
 * nghiệp vụ đầy đủ của Order (printBill/confirmPayment/cancel/addItem...) —
 * entity đó sẽ được xây riêng ở order.entity.ts khi làm luồng gọi món/thanh
 * toán thật, theo đúng cấu trúc mẫu trong CLAUDE.md.
 */
export type OrderListItem = {
  id: number;
  tableName: string;
  areaName: string;
  status: OrderStatus;
  totalAmount: number | null;
  paymentMethod: PaymentMethod | null;
  createdByName: string;
  createdAt: Date;
  printedAt: Date | null;
  paidConfirmedAt: Date | null;
};
