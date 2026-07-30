import type { OrderRepository } from "~/modules/order/domain/order.repository";
import type {
  ListShiftsParams,
  ShiftListItem,
  ShiftRepository,
} from "../domain/shift.repository";

export type ShiftListItemWithRevenue = ShiftListItem & {
  totalRevenue: number;
  paidOrderCount: number;
};

export type ListShiftsWithRevenueResult = {
  items: ShiftListItemWithRevenue[];
  total: number;
};

/**
 * Ghép doanh thu (order module) vào danh sách ca (shift module) ở tầng
 * usecase — cùng cách order/application/list-tables-for-ordering.usecase.ts
 * đã ghép table + order, tránh circular import giữa 2 module. Tái dùng
 * thẳng `getRevenueByShift` đã xây cho trang Báo cáo, không cần method mới.
 */
export async function listShifts(
  shiftRepository: ShiftRepository,
  orderRepository: OrderRepository,
  params: ListShiftsParams,
): Promise<ListShiftsWithRevenueResult> {
  const { items, total } = await shiftRepository.list(params);
  if (items.length === 0) return { items: [], total };

  const revenueRows = await orderRepository.getRevenueByShift(items.map((item) => item.id));
  const revenueByShiftId = new Map(revenueRows.map((row) => [row.shiftId, row]));

  return {
    items: items.map((item) => {
      const revenue = revenueByShiftId.get(item.id);
      return {
        ...item,
        totalRevenue: revenue?.totalRevenue ?? 0,
        paidOrderCount: revenue?.paidOrderCount ?? 0,
      };
    }),
    total,
  };
}
