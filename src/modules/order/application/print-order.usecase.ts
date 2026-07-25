import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type PrintOrderParams = {
  orderId: number;
  actorId: string;
};

/**
 * Chuyển trạng thái order sang "printed" (điều kiện bắt buộc để thanh toán).
 * CHƯA gọi máy in thật (cần thư viện `escpos` — xem package.json của
 * pos-be — và cấu hình IP máy in từ module Máy in). Việc đẩy lệnh in ESC/POS
 * thật sự để làm ở task riêng; usecase này chỉ đảm bảo state machine đúng.
 */
export async function printOrder(
  repository: OrderRepository,
  params: PrintOrderParams,
): Promise<Order> {
  const orderEntity = await repository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  orderEntity.printBill();

  const saved = await repository.save(orderEntity);
  await repository.recordEvent({
    orderId: saved.id!,
    actorId: params.actorId,
    eventType: "bill_printed",
    payload: { totalAmount: saved.totalAmount },
  });
  return saved;
}
