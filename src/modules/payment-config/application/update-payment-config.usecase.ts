import type { PaymentConfig } from "../domain/payment-config.entity";
import type {
  PaymentConfigRepository,
  UpdatePaymentConfigParams,
} from "../domain/payment-config.repository";

export type UpdatePaymentConfigResult = {
  /** null nếu đây là lần đầu thiết lập — chưa từng có bản ghi nào trước đó. */
  before: PaymentConfig | null;
  after: PaymentConfig;
};

export async function updatePaymentConfig(
  repository: PaymentConfigRepository,
  params: UpdatePaymentConfigParams,
): Promise<UpdatePaymentConfigResult> {
  const before = await repository.get();
  const after = await repository.update(params);
  return { before, after };
}
