import type { OrderListItem, OrderStatus } from "./order-list-item.entity";

export type ListOrdersParams = {
  page: number;
  pageSize: number;
  status?: OrderStatus;
};

export type ListOrdersResult = {
  items: OrderListItem[];
  total: number;
};

/**
 * Chỉ có `list` — module này hiện chỉ phục vụ trang hiển thị đơn hàng
 * (read-only). Các method nghiệp vụ (save/findById cho addItem/printBill/
 * confirmPayment/cancel...) sẽ bổ sung interface này khi làm luồng gọi
 * món/thanh toán thật, không viết trước cho đỡ speculative.
 */
export interface OrderRepository {
  list(params: ListOrdersParams): Promise<ListOrdersResult>;
}
