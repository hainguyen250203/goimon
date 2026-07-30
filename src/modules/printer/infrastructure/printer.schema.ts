import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const printer = pgTable("printers", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  port: integer("port").notNull(),
  // "bill" | "kitchen" ở tầng TS (xem printer.entity.ts) — varchar thay vì
  // enum Postgres riêng, khớp cách các status khác trong repo đang làm.
  type: varchar("type", { length: 20 }).notNull().default("bill"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
