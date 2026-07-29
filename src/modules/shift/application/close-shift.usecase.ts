import { NoOpenShiftError, ShiftHasActiveOrdersError } from "../domain/shift.errors";
import type { Shift, ShiftDetail } from "../domain/shift.entity";
import type { ShiftRepository } from "../domain/shift.repository";
import type { OrderRepository } from "~/modules/order/domain/order.repository";

export type CloseShiftResult = {
  before: ShiftDetail;
  after: Shift;
};

/**
 * Chặn đóng ca nếu còn đơn "open" chưa xử lý xong (kể cả đã in bill, chưa
 * thanh toán) — tránh tình trạng bàn còn đơn dở mà ca đã đóng, dữ liệu đối
 * soát doanh thu sai lệch. Chỉ 1 ca mở tại 1 thời điểm nên mọi đơn đang
 * active đều thuộc ca này.
 */
export async function closeShift(
  repository: ShiftRepository,
  orderRepository: OrderRepository,
  closedBy: string,
): Promise<CloseShiftResult> {
  const openShift = await repository.findOpen();
  if (!openShift) throw new NoOpenShiftError();

  const activeOrders = await orderRepository.listActive();
  if (activeOrders.length > 0) throw new ShiftHasActiveOrdersError();

  // Snapshot NGAY trước khi mutate — Shift.close() đổi state in-place, sau
  // đó object gốc không còn phản ánh được trạng thái "trước khi đóng" nữa.
  const before = openShift.toDetail();
  openShift.close(closedBy);
  const after = await repository.save(openShift);
  return { before, after };
}
