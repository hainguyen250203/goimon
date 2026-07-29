import type { PaymentConfig } from "../domain/payment-config.entity";
import type {
  PaymentConfigRepository,
  UpdatePaymentConfigParams,
} from "../domain/payment-config.repository";

export function updatePaymentConfig(
  repository: PaymentConfigRepository,
  params: UpdatePaymentConfigParams,
): Promise<PaymentConfig> {
  return repository.update(params);
}
