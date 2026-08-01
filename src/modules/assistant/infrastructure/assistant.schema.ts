import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "~/server/better-auth/schema";

export const assistantMessageRoleEnum = pgEnum("assistant_message_role", [
  "user",
  "assistant",
]);

export const assistantSession = pgTable(
  "assistant_sessions",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    title: varchar("title", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // Xoá mềm: giữ lại phiên (và tin nhắn) để audit ngay cả khi người dùng "xoá" trên UI.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("assistant_sessions_user_id_updated_at_idx").on(t.userId, t.updatedAt),
  ],
);

export const assistantMessage = pgTable(
  "assistant_messages",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => assistantSession.id, { onDelete: "cascade" }),
    role: assistantMessageRoleEnum("role").notNull(),
    // Mảng "parts" (text / tool-call / tool-result) theo hình dạng UIMessage của AI SDK.
    contentJson: jsonb("content_json").notNull(),
    usageJson: jsonb("usage_json"),
    model: varchar("model", { length: 60 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("assistant_messages_session_id_created_at_idx").on(
      t.sessionId,
      t.createdAt,
    ),
  ],
);

export const assistantSessionRelations = relations(
  assistantSession,
  ({ one, many }) => ({
    user: one(user, {
      fields: [assistantSession.userId],
      references: [user.id],
    }),
    messages: many(assistantMessage),
  }),
);

export const assistantMessageRelations = relations(
  assistantMessage,
  ({ one }) => ({
    session: one(assistantSession, {
      fields: [assistantMessage.sessionId],
      references: [assistantSession.id],
    }),
  }),
);
