import { asc, eq } from "drizzle-orm";

import { db } from "~/server/db";
import type { PaymentConfig } from "../domain/payment-config.entity";
import type {
  PaymentConfigRepository,
  UpdatePaymentConfigParams,
} from "../domain/payment-config.repository";
import { paymentConfig } from "./payment-config.schema";

function toEntity(row: {
  id: number;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
}): PaymentConfig {
  return {
    id: row.id,
    bankCode: row.bankCode,
    bankAccountNumber: row.bankAccountNumber,
    bankAccountName: row.bankAccountName,
  };
}

export const paymentConfigDrizzleRepository: PaymentConfigRepository = {
  async get(): Promise<PaymentConfig | null> {
    const rows = await db.select().from(paymentConfig).orderBy(asc(paymentConfig.id)).limit(1);
    const row = rows[0];
    return row ? toEntity(row) : null;
  },

  async update(params: UpdatePaymentConfigParams): Promise<PaymentConfig> {
    const rows = await db
      .select({ id: paymentConfig.id })
      .from(paymentConfig)
      .orderBy(asc(paymentConfig.id))
      .limit(1);
    const existing = rows[0];

    if (!existing) {
      const [row] = await db.insert(paymentConfig).values(params).returning();
      if (!row) throw new Error("Lưu thông tin ngân hàng thất bại.");
      return toEntity(row);
    }

    const [row] = await db
      .update(paymentConfig)
      .set(params)
      .where(eq(paymentConfig.id, existing.id))
      .returning();
    if (!row) throw new Error("Lưu thông tin ngân hàng thất bại.");
    return toEntity(row);
  },
};
