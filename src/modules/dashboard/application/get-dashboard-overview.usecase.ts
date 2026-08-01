import type { OrderRepository } from "~/modules/order/domain/order.repository";
import type { ShiftRepository } from "~/modules/shift/domain/shift.repository";
import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
import type { DashboardOverview } from "../domain/dashboard-overview.entity";

/**
 * Ghép dữ liệu từ 3 module (order/shift/table) cho trang Tổng quan — cùng
 * cách order/application/list-tables-for-ordering.usecase.ts đã ghép table +
 * order ở tầng usecase để tránh circular import giữa các module.
 *
 * Số liệu đơn hàng theo CA GẦN NHẤT (đang mở hoặc vừa đóng) — cố tình không
 * chỉ lấy ca đang mở, vì đóng ca xong vẫn cần xem lại số liệu ca đó ngay
 * trên Tổng quan thay vì rơi vào trạng thái "chưa có ca nào".
 */
export async function getDashboardOverview(
  orderRepository: OrderRepository,
  shiftRepository: ShiftRepository,
  tableRepository: RestaurantTableRepository,
): Promise<DashboardOverview> {
  const [shift, tables, activeOrders] = await Promise.all([
    shiftRepository.findLatest(),
    tableRepository.listAll(),
    orderRepository.listActive(),
  ]);
  // "Đang phục vụ/trống" luôn suy từ order đang mở, không lưu cột riêng trên
  // bảng tables (xem CLAUDE.md) — đếm trực tiếp ở đây thay vì countByStatus().
  const occupiedTableIds = new Set(activeOrders.map((o) => o.tableId));
  const occupied = tables.filter((t) => occupiedTableIds.has(t.id)).length;
  const tableCounts = { available: tables.length - occupied, occupied, total: tables.length };

  let latestShift: DashboardOverview["latestShift"] = null;
  if (shift) {
    const detail = shift.toDetail();
    const stats = await orderRepository.getShiftOrderStats(detail.id);
    latestShift = {
      id: detail.id,
      status: detail.status,
      startTime: detail.startTime,
      endTime: detail.endTime,
      ...stats,
    };
  }

  return { latestShift, tables: tableCounts };
}
