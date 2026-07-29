import { NoOpenShiftError, ShiftHasActiveOrdersError } from "../domain/shift.errors";
import type { Shift } from "../domain/shift.entity";
import type { ShiftRepository } from "../domain/shift.repository";
import type { OrderRepository } from "~/modules/order/domain/order.repository";

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
): Promise<Shift> {
  const openShift = await repository.findOpen();
  if (!openShift) throw new NoOpenShiftError();

  const activeOrders = await orderRepository.listActive();
  if (activeOrders.length > 0) throw new ShiftHasActiveOrdersError();

  openShift.close(closedBy);
  return repository.save(openShift);
}
