export type DashboardOverview = {
  /** Ca GẦN NHẤT (đang mở hoặc vừa đóng), không phải luôn là ca đang mở — để
   * xem lại được số liệu ngay sau khi đóng ca thay vì mất trắng. null nghĩa
   * là nhà hàng chưa từng mở ca nào. */
  latestShift: {
    id: number;
    status: "open" | "closed";
    startTime: Date;
    endTime: Date | null;
    totalRevenue: number;
    paidOrderCount: number;
    openOrderCount: number;
    cancelledOrderCount: number;
  } | null;
  tables: {
    available: number;
    occupied: number;
    total: number;
  };
};
