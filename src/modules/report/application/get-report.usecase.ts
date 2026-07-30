import type { OrderRepository } from "~/modules/order/domain/order.repository";
import type { ShiftRepository } from "~/modules/shift/domain/shift.repository";
import type { ReportData, ReportDateRange, ReportSummary } from "../domain/report.entity";

const EMPTY_SUMMARY: ReportSummary = {
  totalRevenue: 0,
  grossRevenue: 0,
  discountAmount: 0,
  paidOrderCount: 0,
  shiftCount: 0,
  averageRevenuePerShift: 0,
};

const EMPTY_REPORT: ReportData = {
  summary: EMPTY_SUMMARY,
  previousSummary: EMPTY_SUMMARY,
  shiftBreakdown: [],
  topItems: [],
  byPaymentMethod: [],
  promotionUsage: [],
  byCategory: [],
};

/** Chỉ tính summary (không tính top items/payment method/...) — dùng cho kỳ
 * trước, tránh chạy thừa toàn bộ query của getReport chỉ để lấy vài con số
 * so sánh. */
async function getSummaryForRange(
  orderRepository: OrderRepository,
  shiftRepository: ShiftRepository,
  range: ReportDateRange,
): Promise<ReportSummary> {
  const shifts = await shiftRepository.listInRange(range);
  if (shifts.length === 0) return EMPTY_SUMMARY;

  const revenueByShift = await orderRepository.getRevenueByShift(shifts.map((s) => s.id));
  const totalRevenue = revenueByShift.reduce((sum, row) => sum + row.totalRevenue, 0);
  const grossRevenue = revenueByShift.reduce((sum, row) => sum + row.grossRevenue, 0);
  const paidOrderCount = revenueByShift.reduce((sum, row) => sum + row.paidOrderCount, 0);
  const shiftCount = shifts.length;
  return {
    totalRevenue,
    grossRevenue,
    discountAmount: Math.max(0, grossRevenue - totalRevenue),
    paidOrderCount,
    shiftCount,
    averageRevenuePerShift: shiftCount > 0 ? Math.round(totalRevenue / shiftCount) : 0,
  };
}

/**
 * Ghép dữ liệu order/shift cho trang Báo cáo — cùng cách
 * dashboard/application/get-dashboard-overview.usecase.ts đã ghép nhiều
 * repository ở tầng usecase để tránh circular import giữa các module.
 *
 * Luôn thống kê theo CA: `range` áp vào `shift.startTime` (qua
 * `shiftRepository.listInRange`) để ra danh sách ca, rồi mọi số liệu khác
 * chỉ nhận danh sách `shiftId` — order module không cần biết gì về "ngày
 * tháng".
 */
export async function getReport(
  orderRepository: OrderRepository,
  shiftRepository: ShiftRepository,
  range: ReportDateRange,
  /** Chỉ tính các danh mục này cho "Món bán chạy"/"Doanh thu theo danh mục" —
   * không ảnh hưởng KPI tổng/các widget khác. Bỏ trống = tính tất cả. */
  categoryIds?: number[],
): Promise<ReportData> {
  const shifts = await shiftRepository.listInRange(range);
  if (shifts.length === 0) return EMPTY_REPORT;

  const shiftIds = shifts.map((s) => s.id);
  const [revenueByShift, topItems, byPaymentMethod, promotionUsage, byCategory] = await Promise.all([
    orderRepository.getRevenueByShift(shiftIds),
    orderRepository.getTopSellingItems(shiftIds, 10, categoryIds),
    orderRepository.getRevenueByPaymentMethod(shiftIds),
    orderRepository.getPromotionUsage(shiftIds),
    orderRepository.getRevenueByCategory(shiftIds, categoryIds),
  ]);

  const revenueByShiftId = new Map(revenueByShift.map((r) => [r.shiftId, r]));
  const shiftBreakdown: ReportData["shiftBreakdown"] = shifts.map((shift) => {
    const revenue = revenueByShiftId.get(shift.id);
    return {
      shiftId: shift.id,
      status: shift.status,
      startTime: shift.startTime,
      endTime: shift.endTime,
      totalRevenue: revenue?.totalRevenue ?? 0,
      paidOrderCount: revenue?.paidOrderCount ?? 0,
      cancelledOrderCount: revenue?.cancelledOrderCount ?? 0,
      cashRevenue: revenue?.cashRevenue ?? 0,
      transferRevenue: revenue?.transferRevenue ?? 0,
      grossRevenue: revenue?.grossRevenue ?? 0,
      discountAmount: revenue?.discountAmount ?? 0,
    };
  });

  const totalRevenue = shiftBreakdown.reduce((sum, row) => sum + row.totalRevenue, 0);
  const grossRevenue = shiftBreakdown.reduce((sum, row) => sum + row.grossRevenue, 0);
  const paidOrderCount = shiftBreakdown.reduce((sum, row) => sum + row.paidOrderCount, 0);
  const shiftCount = shifts.length;

  // So sánh với kỳ ngay trước, cùng độ dài — vd chọn 1-31/7 thì kỳ trước là 1-30/6.
  const durationMs = range.end.getTime() - range.start.getTime();
  const previousRange: ReportDateRange = {
    start: new Date(range.start.getTime() - durationMs),
    end: range.start,
  };
  const previousSummary = await getSummaryForRange(orderRepository, shiftRepository, previousRange);

  return {
    summary: {
      totalRevenue,
      grossRevenue,
      discountAmount: Math.max(0, grossRevenue - totalRevenue),
      paidOrderCount,
      shiftCount,
      averageRevenuePerShift: shiftCount > 0 ? Math.round(totalRevenue / shiftCount) : 0,
    },
    previousSummary,
    shiftBreakdown,
    topItems,
    byPaymentMethod,
    promotionUsage,
    byCategory,
  };
}
