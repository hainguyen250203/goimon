import type { OrderRepository } from "~/modules/order/domain/order.repository";
import type { ShiftRepository } from "~/modules/shift/domain/shift.repository";
import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
import type { DashboardOverview } from "../domain/dashboard-overview.entity";

/**
 * Ghép dữ liệu từ 3 module (order/shift/table) cho trang Tổng quan — cùng
 * cách order/application/list-tables-for-ordering.usecase.ts đã ghép table +
 * order ở tầng usecase để tránh circular import giữa các module.
 *
 * Toàn bộ số liệu đơn hàng luôn theo CA ĐANG MỞ hiện tại, không theo ngày —
 * nếu chưa có ca nào đang mở thì `currentShift` là null, không tự suy ra
 * khoảng thời gian nào khác.
 */
export async function getDashboardOverview(
  orderRepository: OrderRepository,
  shiftRepository: ShiftRepository,
  tableRepository: RestaurantTableRepository,
): Promise<DashboardOverview> {
  const [openShift, tableCounts] = await Promise.all([
    shiftRepository.findOpen(),
    tableRepository.countByStatus(),
  ]);

  let currentShift: DashboardOverview["currentShift"] = null;
  if (openShift) {
    const detail = openShift.toDetail();
    const stats = await orderRepository.getShiftOrderStats(detail.id);
    currentShift = { id: detail.id, startTime: detail.startTime, ...stats };
  }

  return { currentShift, tables: tableCounts };
}
