import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type PrintOrderParams = {
  orderId: number;
};

/**
 * Set printedAt trên order — KHÔNG đổi status, in bill chỉ là 1 hành động độc
 * lập với việc thanh toán (đơn vẫn "open" trước/sau khi in, và confirmPayment
 * không yêu cầu đã in).
 * CHƯA gọi máy in thật (cần thư viện `escpos` — xem package.json của
 * pos-be — và cấu hình IP máy in từ module Máy in). Việc đẩy lệnh in ESC/POS
 * thật sự để làm ở task riêng; usecase này chỉ đảm bảo state machine đúng.
 *
 * Không ghi order_event cho hành động này — in bill chỉ là bước trung gian
 * để khách xem/thanh toán (đơn vẫn "open", chưa có gì nghiệp vụ đáng audit),
 * không phải 1 mốc đáng lưu vào lịch sử như gọi món/thanh toán.
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
