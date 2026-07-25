// Nguồn thật của 2 type này là order-status.ts (dùng chung với order.entity.ts
// — entity nghiệp vụ đầy đủ). Re-export ở đây để các nơi đã import từ
// order-list-item.entity.ts (trang danh sách) không phải đổi lại.
import type { OrderStatus, PaymentMethod } from "./order-status";
export type { OrderStatus, PaymentMethod };

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
  promotionName: string | null;
  paymentMethod: PaymentMethod | null;
  createdByName: string;
  createdAt: Date;
  printedAt: Date | null;
  paidConfirmedAt: Date | null;
};
