import type { Order } from "../domain/order.entity";
import type { PaymentMethod } from "../domain/order-status";
import type { OrderRepository } from "../domain/order.repository";

export type ConfirmPaymentParams = {
  orderId: number;
  actorId: string;
  paymentMethod: PaymentMethod;
};

export async function confirmPayment(
  orderRepository: OrderRepository,
  params: ConfirmPaymentParams,
): Promise<Order> {
  const orderEntity = await orderRepository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  orderEntity.confirmPayment(params.actorId, params.paymentMethod);

  const saved = await orderRepository.save(orderEntity);
  await orderRepository.recordEvent({
    orderId: saved.id!,
    actorId: params.actorId,
    eventType: "payment_confirmed",
    payload: { paymentMethod: params.paymentMethod, totalAmount: saved.totalAmount },
  });
  return saved;
}
