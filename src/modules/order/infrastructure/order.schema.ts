import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { restaurantTable } from "~/modules/table/infrastructure/table.schema";
import { menuItem } from "~/modules/menu/infrastructure/menu.schema";
import { user } from "~/server/better-auth/schema";

// Không có entity "invoice" riêng — order tự mang vòng đời thanh toán:
// open (đang gọi món) -> printed (đã in bill, chờ thanh toán) -> paid / cancelled.
// Rule chuyển trạng thái nằm trong domain/order.entity.ts, KHÔNG phải ở đây.
export const orderStatusEnum = pgEnum("order_status", [
  "open",
  "printed",
  "paid",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "transfer",
]);

// Tên bảng SQL là "orders" (số nhiều, không phải "order") vì "order" là từ
// khoá reserved của SQL — biến/import TS vẫn tên `order` như bình thường.
export const order = pgTable(
  "orders",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    tableId: integer("table_id")
      .notNull()
      .references(() => restaurantTable.id),
    status: orderStatusEnum("status").notNull().default("open"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    note: text("note"),
    // Chốt tại lần in bill gần nhất; null khi order chưa từng được in.
    totalAmount: integer("total_amount"),
    printedAt: timestamp("printed_at"),
    // Chỉ là nhãn ghi lại lúc confirmPayment, không tích hợp cổng thanh toán.
    paymentMethod: paymentMethodEnum("payment_method"),
    paidConfirmedBy: text("paid_confirmed_by").references(() => user.id),
    paidConfirmedAt: timestamp("paid_confirmed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("orders_created_by_idx").on(t.createdBy),
    index("orders_table_id_idx").on(t.tableId),
    index("orders_status_idx").on(t.status),
    index("orders_status_paid_confirmed_at_idx").on(
      t.status,
      t.paidConfirmedAt,
    ),
    // Mỗi bàn chỉ có tối đa 1 order đang hoạt động (chưa paid/cancelled).
    uniqueIndex("orders_active_per_table_idx")
      .on(t.tableId)
      .where(sql`${t.status} in ('open', 'printed')`),
  ],
);

export const orderItem = pgTable(
  "order_items",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => order.id),
    menuItemId: integer("menu_item_id")
      .notNull()
      .references(() => menuItem.id),
    // Snapshot tại thời điểm thêm món — không đổi khi menu_item đổi sau đó.
    itemName: varchar("item_name", { length: 200 }).notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull().default(1),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("order_items_order_id_idx").on(t.orderId)],
);

// Timeline đầy đủ của 1 order: gọi món + in bill + thanh toán + huỷ.
// Khác activity_logs (audit log toàn hệ thống, không gắn 1 order cụ thể).
export const orderEvent = pgTable(
  "order_events",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => order.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("order_events_order_id_created_at_idx").on(
      t.orderId,
      t.createdAt,
    ),
  ],
);

export const orderRelations = relations(order, ({ one, many }) => ({
  table: one(restaurantTable, {
    fields: [order.tableId],
    references: [restaurantTable.id],
  }),
  createdByUser: one(user, {
    fields: [order.createdBy],
    references: [user.id],
  }),
  items: many(orderItem),
  events: many(orderEvent),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
  menuItem: one(menuItem, {
    fields: [orderItem.menuItemId],
    references: [menuItem.id],
  }),
}));

export const orderEventRelations = relations(orderEvent, ({ one }) => ({
  order: one(order, {
    fields: [orderEvent.orderId],
    references: [order.id],
  }),
  actor: one(user, { fields: [orderEvent.actorId], references: [user.id] }),
}));
