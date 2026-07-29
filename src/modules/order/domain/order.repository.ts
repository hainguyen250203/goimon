import type { Order } from "./order.entity";
import type { OrderListItem, OrderStatus } from "./order-list-item.entity";

export type ListOrdersParams = {
  page: number;
  pageSize: number;
  status?: OrderStatus;
  /** Lọc đơn có món khớp tên (không dấu, server-side unaccent) — cho trang Lịch sử gọi món. */
  search?: string;
  /** Lọc theo ca làm việc — cho cột "Ca" ở trang admin /quan-ly/don-hang. */
  shiftId?: number;
  /** Chỉ đơn do người này tạo — router tự set khi role "user" (nhân viên chỉ xem đơn mình tạo ở /goi-mon/cua-hang). */
  createdBy?: string;
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
  /** Chỉ set ở event "items_added"/"items_removed" — xem order.schema.ts. */
  itemsSummary?: string;
};

export type ActiveOrderSummary = {
  tableId: number;
  orderId: number;
  subtotal: number;
  createdAt: Date;
};

export type ShiftSummary = {
  orderCount: number;
  totalRevenue: number;
};

/**
 * 1 dòng "gọi món"/"trả món" (event items_added hoặc items_removed) — cho
 * trang Lịch sử gọi món. Tăng/giảm số lượng món đã gọi cũng được ghi vào 2
 * loại event này (phần chênh lệch), vì bản chất tăng/giảm số lượng chính là
 * gọi thêm/trả bớt món — xem update-order-items.usecase.ts.
 */
export type OrderItemEventEntry = {
  id: number;
  eventType: "items_added" | "items_removed";
  tableName: string;
  actorName: string;
  items: { itemName: string; quantity: number; unitPrice: number; note: string | null }[];
  createdAt: Date;
};

export type ListOrderItemEventsParams = {
  page: number;
  pageSize: number;
  /** Tìm không dấu server-side (unaccent) trên items_summary. */
  search?: string;
  /** Chỉ event do người này thao tác — router tự set khi role "user" (nhân viên chỉ xem hành động của mình ở /goi-mon/cua-hang). */
  actorId?: string;
};

export type ListOrderItemEventsResult = {
  items: OrderItemEventEntry[];
  total: number;
};

/**
 * 1 dòng bất kỳ trong timeline đầy đủ của 1 order (gọi món, trả món, sửa số
 * lượng, in bill, thanh toán, áp/gỡ khuyến mãi, huỷ đơn) — cho trang lịch sử
 * của riêng order đó (khác OrderItemEventEntry — trang Lịch sử gọi món chỉ
 * lọc 2 loại event và không gắn với 1 order cụ thể). `payload` giữ nguyên
 * dạng JSON thô, UI tự diễn giải theo `eventType` khi hiển thị.
 */
export type OrderTimelineEvent = {
  id: number;
  eventType: string;
  actorName: string;
  payload: unknown;
  createdAt: Date;
};

export interface OrderRepository {
  list(params: ListOrdersParams): Promise<ListOrdersResult>;
  /** Order đang "open" (chưa thanh toán/huỷ, có thể đã in bill hay chưa) của 1 bàn — tối đa 1 (DB có unique index đảm bảo). */
  findActiveByTableId(tableId: number): Promise<Order | null>;
  findById(id: number): Promise<Order | null>;
  /** Upsert order + diff order_items (insert món mới/update món đổi/xoá món bị gỡ) trong 1 transaction. */
  save(order: Order): Promise<Order>;
  /** Ghi 1 dòng vào order_events — timeline riêng của order, khác activity_logs. */
  recordEvent(params: RecordOrderEventParams): Promise<void>;
  /** Mọi order đang "open" (toàn nhà hàng) — cho màn hình chọn bàn gọi món
   * ghép running total lên từng bàn, không phải table module tự query bảng orders. */
  listActive(): Promise<ActiveOrderSummary[]>;
  /** Số đơn + doanh thu đã thanh toán trong 1 ca — cho màn hình đóng ca/lịch sử ca. */
  getShiftSummary(shiftId: number): Promise<ShiftSummary>;
  /** Lịch sử gọi món (event items_added + items_removed), phân trang + tìm không dấu server-side. */
  listOrderItemEvents(
    params: ListOrderItemEventsParams,
  ): Promise<ListOrderItemEventsResult>;
  /** Toàn bộ timeline của 1 order cụ thể, mới nhất trước — cho trang lịch sử của order đó. */
  getOrderTimeline(orderId: number): Promise<OrderTimelineEvent[]>;
}
