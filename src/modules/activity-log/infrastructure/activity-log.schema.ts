import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "~/server/better-auth/schema";

// Audit log cho các hành động KHÔNG gắn với 1 order cụ thể (menu, role,
// printer...). Vòng đời order/thanh toán/huỷ đã có order_events lo riêng.
export const activityLog = pgTable(
  "activity_logs",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    // Không FK — polymorphic, id của các entity khác kiểu nhau (text/integer).
    entityId: varchar("entity_id", { length: 50 }).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activity_logs_entity_idx").on(
      t.entityType,
      t.entityId,
      t.createdAt,
    ),
    index("activity_logs_actor_id_created_at_idx").on(
      t.actorId,
      t.createdAt,
    ),
  ],
);

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  actor: one(user, { fields: [activityLog.actorId], references: [user.id] }),
}));
