import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

import { role } from "~/modules/role/infrastructure/role.schema";

// Tên bảng SQL số nhiều ("users", "sessions"...) theo quy tắc đặt tên chung
// của cả DB — biến/import TS vẫn số ít (`user`, `session`...) như bình thường.
export const user = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  // FK theo TÊN (không phải id) tới `role.name` — cột này Postgres cho phép
  // vì `role.name` đã có UNIQUE (FK không bắt buộc phải trỏ khoá chính). Vẫn
  // giữ nguyên kiểu text để không đụng gì tới BetterAuth (thư viện tự quản
  // lý cột này, đọc thẳng ra `session.user.role` dạng chuỗi ở khắp app) —
  // chỉ thêm ràng buộc DB: đổi tên role tự cascade qua mọi user đang gán
  // (ON UPDATE CASCADE, xem role.drizzle-repository.ts), không xoá được role
  // còn user dùng (ON DELETE RESTRICT, cùng chặn với countUsersWithRoleName
  // ở application layer — DB giờ đảm bảo thêm 1 lớp không thể lách qua).
  role: text("role")
    .default("user")
    .notNull()
    .references(() => role.name, { onDelete: "restrict", onUpdate: "cascade" }),
  // Cờ giám sát ẩn — bypass mọi permission check. KHÔNG có UI bật/tắt ở bất
  // kỳ đâu (kể cả trang Người dùng/Vai trò), chỉ set trực tiếp qua DB/script.
  // Đăng ký `input: false` ở better-auth/config.ts để chặn luôn việc set qua
  // API cập nhật hồ sơ.
  isSuper: boolean("is_super").default(false).notNull(),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified"),
});

export const session = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
