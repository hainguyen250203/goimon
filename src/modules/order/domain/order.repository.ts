import type { Order } from "./order.entity";
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

export type RecordOrderEventParams = {
  orderId: number;
  actorId: string;
  eventType: string;
  payload?: Record<string, unknown>;
};

export type ActiveOrderSummary = {
  tableId: number;
  orderId: number;
  subtotal: number;
  createdAt: Date;
};

export interface OrderRepository {
  list(params: ListOrdersParams): Promise<ListOrdersResult>;
  /** Order đang "open" hoặc "printed" của 1 bàn — tối đa 1 (DB có unique index đảm bảo). */
  findActiveByTableId(tableId: number): Promise<Order | null>;
  findById(id: number): Promise<Order | null>;
  /** Upsert order + diff order_items (insert món mới/update món đổi/xoá món bị gỡ) trong 1 transaction. */
  save(order: Order): Promise<Order>;
  /** Ghi 1 dòng vào order_events — timeline riêng của order, khác activity_logs. */
  recordEvent(params: RecordOrderEventParams): Promise<void>;
  /** Mọi order đang "open"/"printed" (toàn nhà hàng) — cho màn hình chọn bàn gọi món
   * ghép running total lên từng bàn, không phải table module tự query bảng orders. */
  listActive(): Promise<ActiveOrderSummary[]>;
}
