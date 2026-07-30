export type DashboardOverview = {
  /** null nghĩa là chưa có ca nào đang mở — trang Tổng quan luôn theo ca đang
   * mở hiện tại, không theo ngày. */
  currentShift: {
    id: number;
    startTime: Date;
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
