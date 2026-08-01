import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const area = pgTable("areas", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Tên bảng SQL là "tables" (số nhiều, không phải "table") vì "table" là từ
// khoá reserved của SQL — biến/import TS vẫn tên `restaurantTable`.
export const restaurantTable = pgTable(
  "tables",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    areaId: integer("area_id")
      .notNull()
      .references(() => area.id),
    name: varchar("name", { length: 100 }).notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("tables_area_id_idx").on(t.areaId)],
);

export const areaRelations = relations(area, ({ many }) => ({
  tables: many(restaurantTable),
}));

export const restaurantTableRelations = relations(
  restaurantTable,
  ({ one }) => ({
    area: one(area, {
      fields: [restaurantTable.areaId],
      references: [area.id],
    }),
  }),
);
