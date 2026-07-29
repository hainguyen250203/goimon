import type { PaymentConfig } from "../domain/payment-config.entity";
import type { PaymentConfigRepository } from "../domain/payment-config.repository";

export function getPaymentConfig(
  repository: PaymentConfigRepository,
): Promise<PaymentConfig | null> {
  return repository.get();
}
