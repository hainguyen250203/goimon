import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type PrintOrderParams = {
  orderId: number;
};

/**
 * Chuyển trạng thái order sang "printed" (điều kiện bắt buộc để thanh toán).
 * CHƯA gọi máy in thật (cần thư viện `escpos` — xem package.json của
 * pos-be — và cấu hình IP máy in từ module Máy in). Việc đẩy lệnh in ESC/POS
 * thật sự để làm ở task riêng; usecase này chỉ đảm bảo state machine đúng.
 *
 * Không ghi order_event cho hành động này — in bill chỉ là bước trung gian
 * để khách xem/thanh toán (đơn vẫn "open"/"printed", chưa có gì nghiệp vụ
 * đáng audit), không phải 1 mốc đáng lưu vào lịch sử như gọi món/thanh toán.
 */
export async function printOrder(
  repository: OrderRepository,
  params: PrintOrderParams,
): Promise<Order> {
  const orderEntity = await repository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  orderEntity.printBill();

  return repository.save(orderEntity);
}
