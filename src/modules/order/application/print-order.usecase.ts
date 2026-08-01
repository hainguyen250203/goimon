import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type PrintOrderParams = {
  orderId: number;
};

/**
 * In bill KHÔNG phải hành động nghiệp vụ — chỉ lấy entity hiện tại để router
 * lắp payload in từ đó (payableAmount luôn tính sống, không cache). In được
 * ở bất kỳ trạng thái/số món nào (kể cả in lại hoá đơn đã thanh toán), không
 * validate, không lưu gì — không gọi `repository.save()`.
 */
export async function printOrder(
  repository: OrderRepository,
  params: PrintOrderParams,
): Promise<Order> {
  const orderEntity = await repository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  return orderEntity;
}
