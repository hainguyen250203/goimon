import type { PaymentConfig } from "./payment-config.entity";

export type UpdatePaymentConfigParams = {
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

export interface PaymentConfigRepository {
  /** Chỉ có tối đa 1 bản ghi trong toàn hệ thống — null nếu admin chưa thiết lập lần nào. */
  get(): Promise<PaymentConfig | null>;
  /** Upsert: chưa có thì tạo mới, đã có thì cập nhật đúng bản duy nhất đó. */
  update(params: UpdatePaymentConfigParams): Promise<PaymentConfig>;
}
