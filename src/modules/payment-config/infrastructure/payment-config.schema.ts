import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Chỉ 1 dòng duy nhất trong bảng này (enforce ở application layer, không
// phải constraint DB) — xem payment-config.drizzle-repository.ts.
export const paymentConfig = pgTable("payment_config", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  bankCode: varchar("bank_code", { length: 20 }).notNull(),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }).notNull(),
  bankAccountName: varchar("bank_account_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
