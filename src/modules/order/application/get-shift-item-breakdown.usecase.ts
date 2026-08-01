import type { OrderRepository, ShiftItemBreakdownRow } from "../domain/order.repository";

export async function getShiftItemBreakdown(
  orderRepository: OrderRepository,
  shiftId: number,
): Promise<ShiftItemBreakdownRow[]> {
  return orderRepository.getShiftItemBreakdown(shiftId);
}
