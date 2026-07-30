export type ReportDateRange = {
  start: Date;
  end: Date;
};

export type ReportSummary = {
  /** Doanh thu thực nhận (sau giảm giá) — số tiền khách thực trả. */
  totalRevenue: number;
  /** Tổng tiền món TRƯỚC giảm giá. */
  grossRevenue: number;
  /** grossRevenue - totalRevenue. */
  discountAmount: number;
  paidOrderCount: number;
  shiftCount: number;
  averageRevenuePerShift: number;
};

/** 1 dòng/ca — ghép metadata ca (giờ mở/đóng) với doanh thu của ca đó, dùng
 * cho cả biểu đồ đường lẫn bảng chi tiết ca. */
export type ReportShiftRow = {
  shiftId: number;
  status: "open" | "closed";
  startTime: Date;
  endTime: Date | null;
  totalRevenue: number;
  paidOrderCount: number;
  cancelledOrderCount: number;
  /** Doanh thu tách theo phương thức thanh toán — cho biểu đồ đường so sánh
   * tiền mặt/chuyển khoản theo từng ca. */
  cashRevenue: number;
  transferRevenue: number;
  /** Tổng tiền món TRƯỚC giảm giá. */
  grossRevenue: number;
  /** grossRevenue - totalRevenue. */
  discountAmount: number;
};

export type ReportTopItem = {
  menuItemId: number;
  itemName: string;
  quantitySold: number;
  revenue: number;
};

export type ReportPaymentMethodRow = {
  paymentMethod: string;
  revenue: number;
  orderCount: number;
};

export type ReportPromotionUsageRow = {
  promotionId: number;
  promotionName: string;
  orderCount: number;
  totalDiscount: number;
};

export type ReportCategoryRow = {
  categoryId: number;
  categoryName: string;
  revenue: number;
};

export type ReportData = {
  summary: ReportSummary;
  /** Cùng số liệu summary nhưng cho khoảng thời gian ngay trước đó, cùng độ
   * dài — để so sánh % tăng/giảm trên KPI. */
  previousSummary: ReportSummary;
  shiftBreakdown: ReportShiftRow[];
  topItems: ReportTopItem[];
  byPaymentMethod: ReportPaymentMethodRow[];
  promotionUsage: ReportPromotionUsageRow[];
  byCategory: ReportCategoryRow[];
};
