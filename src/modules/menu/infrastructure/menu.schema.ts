import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const category = pgTable("categories", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const menuItem = pgTable(
  "menu_items",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => category.id),
    name: varchar("name", { length: 200 }).notNull(),
    // VNĐ, không có số lẻ. Sửa tay bất cứ lúc nào cho "giá theo ngày"
    // (giá thị trường) — activity_log ghi lại lịch sử thay đổi.
    price: integer("price").notNull(),
    // Còn/hết món (tồn kho tức thời) — khác isPublished bên dưới.
    isAvailable: boolean("is_available").notNull().default(true),
    // Có hiển thị/bán trong menu hay bị ẩn (soft-delete), khác isAvailable.
    isPublished: boolean("is_published").notNull().default(true),
    // Món này có in ra phiếu bếp không — vd bia/nước ngọt thường tắt vì bếp
    // không cần pha chế/chuẩn bị. Không ảnh hưởng hoá đơn thanh toán, chỉ
    // lọc lúc build phiếu bếp (xem order.router.ts).
    printToKitchen: boolean("print_to_kitchen").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("menu_items_is_available_idx").on(t.isAvailable),
    index("menu_items_category_id_idx").on(t.categoryId),
  ],
);

export const categoryRelations = relations(category, ({ many }) => ({
  menuItems: many(menuItem),
}));

export const menuItemRelations = relations(menuItem, ({ one }) => ({
  category: one(category, {
    fields: [menuItem.categoryId],
    references: [category.id],
  }),
}));
