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
  /** true = CHỈ lấy đơn đã xoá mềm (superadmin-only, chặn ở order.router.ts).
   * undefined/false = mặc định, LOẠI TRỪ đơn đã xoá khỏi mọi danh sách khác. */
  deleted?: boolean;
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

export type ShiftOrderStats = {
  totalRevenue: number;
  paidOrderCount: number;
  openOrderCount: number;
  cancelledOrderCount: number;
  /** Doanh thu "sống" của các đơn `open` — tính từ orderItem hiện tại, không
   * phải `order.totalAmount` (cột này null tới khi confirmPayment() chạy,
   * đơn `open` luôn null kể cả đã in bill). */
  openRevenue: number;
};

/** 1 dòng doanh thu của 1 ca — cho trang Báo cáo (biểu đồ + bảng chi tiết). */
export type ShiftRevenueRow = {
  shiftId: number;
  /** Doanh thu thực nhận (sau giảm giá) — chính là orders.total_amount, số
   * tiền khách thực trả. */
  totalRevenue: number;
  paidOrderCount: number;
  cancelledOrderCount: number;
  /** Doanh thu tách theo phương thức thanh toán — cho biểu đồ Báo cáo so sánh
   * tiền mặt/chuyển khoản theo từng ca. */
  cashRevenue: number;
  transferRevenue: number;
  /** Tổng tiền món TRƯỚC giảm giá (sum unitPrice*quantity của order_items). */
  grossRevenue: number;
  /** grossRevenue - totalRevenue — số tiền đã giảm giá, suy ra chứ không lưu
   * cột riêng (xem giải thích ở getPromotionUsage). */
  discountAmount: number;
};

export type TopSellingItem = {
  menuItemId: number;
  itemName: string;
  quantitySold: number;
  revenue: number;
};

/** 1 dòng món đã bán trong 1 ca — cho dialog "Tổng kết ca làm" ở trang
 * /quan-ly/ca-lam-viec. Khác TopSellingItem: đây LUÔN đúng 1 ca (không nhận
 * mảng shiftIds/limit/categoryIds) — hiển thị đủ mọi món đã bán để đối soát,
 * không phải top-N. */
export type ShiftItemBreakdownRow = {
  menuItemId: number;
  itemName: string;
  quantity: number;
  /** Giá gốc (unitPrice * quantity), CHƯA trừ khuyến mãi — có thể cao hơn
   * ShiftSummary.totalRevenue nếu ca có đơn dùng khuyến mãi. */
  subtotal: number;
};

export type PaymentMethodRevenue = {
  paymentMethod: string;
  revenue: number;
  orderCount: number;
};

export type PromotionUsageRow = {
  promotionId: number;
  promotionName: string;
  orderCount: number;
  /** Suy ra từ (tổng tiền order_items) - totalAmount, không lưu sẵn cột nào —
   * cả 2 giá trị đã đóng băng khi đơn "paid" nên tính lúc nào cũng đúng. */
  totalDiscount: number;
};

export type CategoryRevenue = {
  categoryId: number;
  categoryName: string;
  revenue: number;
};

/**
 * 1 dòng "số lần 1 đơn đang hoạt động trùng vào khung giờ này" — TỔNG cộng
 * dồn qua mọi ngày trong danh sách ca, CHƯA chia trung bình (usecase mới biết
 * số ca để chia, xem get-report.usecase.ts). `hour` là giờ THẬT 0-23; mảng
 * trả về LUÔN đủ 24 phần tử, sắp theo chu kỳ 12h trưa → 11h trưa hôm sau
 * (index 0 = giờ 12, index 23 = giờ 11), không phải 0-23 tăng dần.
 */
export type BusyHourOccurrence = {
  hour: number;
  occurrenceCount: number;
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
  /** Chỉ event thuộc ca này — bắt buộc, router luôn tự gán ca đang mở trước
   * khi gọi tới đây (không có chế độ "xem toàn bộ" cho usecase này, khác
   * ListOrdersParams). */
  shiftId: number;
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

export type ListTableTransferEventsParams = {
  page: number;
  pageSize: number;
  /** Chỉ event do người này thao tác — cùng quy tắc role "user" như listOrderItemEvents. */
  actorId?: string;
  /** Chỉ event thuộc ca này — bắt buộc, router luôn tự gán ca đang mở (xem
   * ListOrderItemEventsParams). */
  shiftId: number;
};

/**
 * 1 dòng "chuyển bàn" (table_changed) hoặc "chuyển món" (items_transferred_out)
 * — cho trang Lịch sử (tab Chuyển bàn/món). Chỉ lấy items_transferred_out,
 * KHÔNG lấy items_transferred_in — 1 lần chuyển ghi 2 event (1 trên đơn
 * nguồn, 1 trên đơn đích), lấy cả 2 sẽ hiện trùng 2 dòng cho cùng 1 lần
 * chuyển. `payload` giữ nguyên dạng thô, UI dùng lại describeEvent() của
 * order-timeline.tsx để diễn giải — cùng cách hiển thị với dialog "Lịch sử đơn".
 */
export type TableTransferEventEntry = {
  id: number;
  eventType: "table_changed" | "items_transferred_out";
  tableName: string;
  actorName: string;
  payload: unknown;
  createdAt: Date;
};

export type ListTableTransferEventsResult = {
  items: TableTransferEventEntry[];
  total: number;
};

export interface OrderRepository {
  list(params: ListOrdersParams): Promise<ListOrdersResult>;
  /** Order đang "open" (chưa thanh toán/huỷ, có thể đã in bill hay chưa) của 1 bàn — tối đa 1 (DB có unique index đảm bảo). */
  findActiveByTableId(tableId: number): Promise<Order | null>;
  findById(id: number): Promise<Order | null>;
  /** Upsert order + diff order_items (insert món mới/update món đổi/xoá món bị gỡ) trong 1 transaction. */
  save(order: Order): Promise<Order>;
  /** Lưu đích + nguồn trong CÙNG 1 transaction — bắt buộc dùng khi 1 nghiệp vụ
   * đụng 2 order cùng lúc (chuyển món/gộp đơn), tránh nửa vời nếu crash giữa
   * chừng (vd đã cộng món vào đích nhưng chưa trừ khỏi nguồn). Tuple cố định
   * 2 phần tử (không phải mảng bất kỳ độ dài) vì cả 2 nơi gọi đều đúng 2 order. */
  saveMany(orders: [Order, Order]): Promise<[Order, Order]>;
  /** Ghi 1 dòng vào order_events — timeline riêng của order, khác activity_logs. */
  recordEvent(params: RecordOrderEventParams): Promise<void>;
  /** Xoá mềm — chỉ set deletedAt, không đổi status (status có thể là bất kỳ
   * giá trị nào tại thời điểm xoá). Không load qua entity vì không có rule
   * nghiệp vụ nào cần validate (xem order.entity.ts — không có method xoá). */
  softDeleteOrder(id: number): Promise<void>;
  /** Mọi order đang "open" (toàn nhà hàng) — cho màn hình chọn bàn gọi món
   * ghép running total lên từng bàn, không phải table module tự query bảng orders. */
  listActive(): Promise<ActiveOrderSummary[]>;
  /** Số đơn + doanh thu đã thanh toán trong 1 ca — cho màn hình đóng ca/lịch sử ca. */
  getShiftSummary(shiftId: number): Promise<ShiftSummary>;
  /** Từng món phân biệt đã bán trong 1 ca (đã thanh toán) — cho dialog "Tổng
   * kết ca làm" ở trang danh sách ca. */
  getShiftItemBreakdown(shiftId: number): Promise<ShiftItemBreakdownRow[]>;
  /** Toàn bộ số liệu đơn hàng của 1 ca theo từng trạng thái (đã thanh toán/đang
   * mở/đã huỷ) — cho trang Tổng quan, luôn theo ca đang mở, không theo ngày. */
  getShiftOrderStats(shiftId: number): Promise<ShiftOrderStats>;
  /** Doanh thu + số đơn (đã thanh toán/đã huỷ) theo TỪNG ca trong danh sách
   * — cho trang Báo cáo. Luôn trả đủ 1 dòng cho mỗi shiftId truyền vào, kể cả
   * ca không có đơn nào (revenue = 0) — để biểu đồ không bị thiếu điểm. */
  getRevenueByShift(shiftIds: number[]): Promise<ShiftRevenueRow[]>;
  /** Top món bán chạy nhất (theo số lượng) trong các ca truyền vào — chỉ tính
   * đơn đã thanh toán. `categoryIds` (nếu có) chỉ tính món thuộc các danh mục
   * đó — cho phép bỏ bớt danh mục không cần khỏi báo cáo. */
  getTopSellingItems(shiftIds: number[], limit: number, categoryIds?: number[]): Promise<TopSellingItem[]>;
  /** Doanh thu theo phương thức thanh toán (tiền mặt/chuyển khoản) trong các
   * ca truyền vào — chỉ tính đơn đã thanh toán. */
  getRevenueByPaymentMethod(shiftIds: number[]): Promise<PaymentMethodRevenue[]>;
  /** Số đơn + số tiền đã giảm theo từng khuyến mãi trong các ca truyền vào —
   * chỉ tính đơn đã thanh toán có áp khuyến mãi. */
  getPromotionUsage(shiftIds: number[]): Promise<PromotionUsageRow[]>;
  /** Doanh thu theo danh mục món (đồ uống/món chính/...) trong các ca truyền
   * vào — chỉ tính đơn đã thanh toán. `categoryIds` (nếu có) chỉ tính các
   * danh mục đó — cho phép bỏ bớt danh mục không cần khỏi báo cáo. */
  getRevenueByCategory(shiftIds: number[], categoryIds?: number[]): Promise<CategoryRevenue[]>;
  /** "Giờ bận rộn" (occupancy, kiểu Google Maps Popular times) — với mỗi khung
   * giờ, tổng số lần 1 đơn đang mở (từ lúc tạo tới lúc thanh toán) trùng vào
   * khung giờ đó, cộng dồn qua toàn bộ ca truyền vào. Chỉ tính đơn đã thanh
   * toán. Không nhận categoryIds — số liệu về LƯU LƯỢNG đơn, không phải món. */
  getBusyHourOccurrences(shiftIds: number[]): Promise<BusyHourOccurrence[]>;
  /** Lịch sử gọi món (event items_added + items_removed), phân trang + tìm không dấu server-side. */
  listOrderItemEvents(
    params: ListOrderItemEventsParams,
  ): Promise<ListOrderItemEventsResult>;
  /** Toàn bộ timeline của 1 order cụ thể, mới nhất trước — cho trang lịch sử của order đó. */
  getOrderTimeline(orderId: number): Promise<OrderTimelineEvent[]>;
  /** Lịch sử chuyển bàn/chuyển món (toàn nhà hàng), phân trang — cho trang Lịch sử, tab Chuyển bàn/món. */
  listTableTransferEvents(
    params: ListTableTransferEventsParams,
  ): Promise<ListTableTransferEventsResult>;
}
