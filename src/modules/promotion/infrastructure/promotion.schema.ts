import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const discountTypeEnum = pgEnum("discount_type", ["percent", "fixed"]);

export const promotion = pgTable("promotions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  discountType: discountTypeEnum("discount_type").notNull(),
  // percent: 1-100 (%); fixed: số tiền VNĐ cố định.
  discountValue: integer("discount_value").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
