import bcrypt from "bcrypt";
import { and, count, desc, eq } from "drizzle-orm";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { account, user as userTable } from "~/server/better-auth/schema";
import type { UserAccount } from "../domain/user-account.entity";
import type {
  BanUserParams,
  CreateUserParams,
  GetUserByIdParams,
  ListUsersParams,
  ListUsersResult,
  SetUserPasswordParams,
  SetUserRoleParams,
  UnbanUserParams,
  UserRepository,
} from "../domain/user.repository";

/**
 * Không có bảng Drizzle riêng cho module này — tài khoản người dùng do
 * BetterAuth sở hữu hoàn toàn (src/server/better-auth/schema.ts). Layer
 * infrastructure/ ở đây đọc/ghi thẳng qua Drizzle (KHÔNG qua `auth.api.*`
 * admin plugin, trừ `createUser` cho phần tạo account+hash mật khẩu) — lý do:
 * mọi endpoint admin plugin có truyền `headers` (ban/unban/setPassword/
 * getUser/listUsers/setRole) đều tự kiểm tra LẠI quyền của người gọi qua
 * `hasPermission()` riêng của BetterAuth, dựa trên `roles` map TĨNH đăng ký ở
 * better-auth/config.ts — role tự tạo qua trang Vai trò (không nằm trong map
 * đó) sẽ luôn bị BetterAuth từ chối dù đã có đủ quyền `nguoi-dung.action` ở
 * hệ thống permission của app. Bỏ hẳn phụ thuộc này, chỉ dùng Drizzle trực
 * tiếp — permissionProcedure ở router đã là điểm chặn quyền duy nhất.
 */
function toEntity(row: typeof userTable.$inferSelect): UserAccount {
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phoneNumber ?? null,
    role: row.role,
    banned: row.banned ?? false,
    banReason: row.banReason ?? null,
    createdAt: row.createdAt,
  };
}

export const userBetterAuthRepository: UserRepository = {
  async getById({ userId }: GetUserByIdParams): Promise<UserAccount> {
    const [row] = await db.select().from(userTable).where(eq(userTable.id, userId));
    if (!row) throw new Error("Không tìm thấy người dùng.");
    return toEntity(row);
  },

  async list({ page, pageSize, role, banned }: ListUsersParams): Promise<ListUsersResult> {
    const offset = (page - 1) * pageSize;
    const conditions = [
      role !== undefined ? eq(userTable.role, role) : undefined,
      banned !== undefined ? eq(userTable.banned, banned) : undefined,
    ];
    const where = conditions.some(Boolean) ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(userTable)
        .where(where)
        .orderBy(desc(userTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(userTable).where(where),
    ]);

    return {
      items: rows.map(toEntity),
      total: totalRows[0]?.value ?? 0,
    };
  },

  async create(params: CreateUserParams): Promise<UserAccount> {
    // KHÔNG truyền `role` cho `auth.api.createUser` — endpoint này từ chối
    // (BAD_REQUEST) bất kỳ role nào không nằm trong `roles` map tĩnh đăng ký
    // ở better-auth/config.ts (verify từ routes.mjs), trong khi role giờ là
    // dữ liệu tự do (bảng `role`, tạo thêm qua trang Vai trò). Không truyền
    // `headers` (gọi server-side, không có request thật) nên endpoint này
    // KHÔNG tự kiểm tra quyền người gọi qua hasPermission — chỉ tạo account.
    // Tạo tài khoản trước (role mặc định "user"), rồi ghi đè cột `role` thẳng
    // qua Drizzle.
    const result = await auth.api.createUser({
      body: {
        // Login là bằng số điện thoại, nhưng schema BetterAuth bắt buộc
        // email unique — dùng email nội bộ giả lập từ số điện thoại, cùng
        // pattern với src/server/db/seed.ts's seedUsers().
        email: `${params.phoneNumber}@pos.internal`,
        password: params.password,
        name: params.name,
        data: {
          phoneNumber: params.phoneNumber,
          phoneNumberVerified: true,
        },
      },
    });
    const [updated] = await db
      .update(userTable)
      .set({ role: params.role })
      .where(eq(userTable.id, result.user.id))
      .returning();
    if (!updated) throw new Error("Tạo tài khoản thất bại.");
    return toEntity(updated);
  },

  async setRole({ userId, role }: SetUserRoleParams): Promise<UserAccount> {
    const [updated] = await db
      .update(userTable)
      .set({ role })
      .where(eq(userTable.id, userId))
      .returning();
    if (!updated) throw new Error("Không tìm thấy người dùng.");
    return toEntity(updated);
  },

  async ban({ userId, banReason }: BanUserParams): Promise<UserAccount> {
    const [updated] = await db
      .update(userTable)
      .set({ banned: true, banReason: banReason ?? null, banExpires: null })
      .where(eq(userTable.id, userId))
      .returning();
    if (!updated) throw new Error("Không tìm thấy người dùng.");
    return toEntity(updated);
  },

  async unban({ userId }: UnbanUserParams): Promise<UserAccount> {
    const [updated] = await db
      .update(userTable)
      .set({ banned: false, banReason: null, banExpires: null })
      .where(eq(userTable.id, userId))
      .returning();
    if (!updated) throw new Error("Không tìm thấy người dùng.");
    return toEntity(updated);
  },

  async setPassword({ userId, newPassword }: SetUserPasswordParams): Promise<void> {
    // bcrypt cost 10 — khớp cấu hình hash ở better-auth/config.ts.
    const hashed = await bcrypt.hash(newPassword, 10);
    await db
      .update(account)
      .set({ password: hashed })
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
  },
};
