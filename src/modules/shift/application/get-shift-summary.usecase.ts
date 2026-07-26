import type { OrderRepository, ShiftSummary } from "~/modules/order/domain/order.repository";

export async function getShiftSummary(
  orderRepository: OrderRepository,
  shiftId: number,
): Promise<ShiftSummary> {
  return orderRepository.getShiftSummary(shiftId);
}
