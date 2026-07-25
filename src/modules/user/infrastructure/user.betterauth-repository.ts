import { auth } from "~/server/better-auth";
import type { UserAccount, UserRole } from "../domain/user-account.entity";
import type {
  BanUserParams,
  CreateUserParams,
  ListUsersParams,
  ListUsersResult,
  SetUserRoleParams,
  UnbanUserParams,
  UserRepository,
} from "../domain/user.repository";

/**
 * Không có bảng Drizzle riêng cho module này — tài khoản người dùng do
 * BetterAuth sở hữu hoàn toàn (src/server/better-auth/schema.ts). Layer
 * infrastructure/ ở đây "chạm" persistence qua BetterAuth admin plugin
 * (`auth.api.*`) thay vì Drizzle trực tiếp — đây vẫn là ranh giới duy nhất
 * được phép chạm hệ thống lưu trữ thật, đúng tinh thần CLAUDE.md, chỉ khác
 * cơ chế so với các module khác (menu/table/printer dùng Drizzle thẳng).
 *
 * Shape các endpoint (`listUsers`, `createUser`, `setRole`, `banUser`,
 * `unbanUser`) verify trực tiếp từ
 * node_modules/better-auth/dist/plugins/admin/admin.d.mts.
 */

// `UserWithRole` (kiểu trả về của BetterAuth) không khai báo tĩnh field
// `phoneNumber`/`phoneNumberVerified` dù cột này có thật trong bảng `users`
// (chúng đến từ phoneNumber plugin, không phải core BetterAuth) — tự khai
// báo type tối thiểu cần dùng thay vì import type nội bộ của better-auth.
type RawUser = {
  id: string;
  name: string;
  phoneNumber?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: Date;
};

function toEntity(row: RawUser): UserAccount {
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phoneNumber ?? null,
    role: (row.role ?? "user") as UserRole,
    banned: row.banned ?? false,
    banReason: row.banReason ?? null,
    createdAt: row.createdAt,
  };
}

export const userBetterAuthRepository: UserRepository = {
  async list({ page, pageSize, role, banned, headers }: ListUsersParams): Promise<ListUsersResult> {
    const offset = (page - 1) * pageSize;

    // BetterAuth's admin listUsers endpoint chỉ hỗ trợ MỘT filterField tại
    // một thời điểm (không AND được 2 điều kiện) — verify từ query schema
    // trong admin.d.mts. Khi cả role lẫn banned cùng được chọn, đẩy filter
    // role xuống DB (rẻ, chỉ 3 giá trị) rồi lọc tiếp banned trong memory
    // trên một batch đủ lớn — chấp nhận được vì danh sách nhân viên của một
    // nhà hàng không bao giờ lớn tới mức cần phân trang thật ở DB.
    if (role !== undefined && banned !== undefined) {
      const result = await auth.api.listUsers({
        query: {
          limit: 1000,
          offset: 0,
          sortBy: "createdAt",
          sortDirection: "desc",
          filterField: "role",
          filterValue: role,
          filterOperator: "eq",
        },
        headers,
      });
      const filtered = (result.users as RawUser[])
        .map(toEntity)
        .filter((u) => u.banned === banned);
      return {
        items: filtered.slice(offset, offset + pageSize),
        total: filtered.length,
      };
    }

    const filter =
      role !== undefined
        ? { filterField: "role" as const, filterValue: role, filterOperator: "eq" as const }
        : banned !== undefined
          ? { filterField: "banned" as const, filterValue: banned, filterOperator: "eq" as const }
          : {};

    const result = await auth.api.listUsers({
      query: {
        limit: pageSize,
        offset,
        sortBy: "createdAt",
        sortDirection: "desc",
        ...filter,
      },
      headers,
    });

    return {
      items: (result.users as RawUser[]).map(toEntity),
      total: result.total,
    };
  },

  async create(params: CreateUserParams): Promise<UserAccount> {
    const result = await auth.api.createUser({
      body: {
        // Login là bằng số điện thoại, nhưng schema BetterAuth bắt buộc
        // email unique — dùng email nội bộ giả lập từ số điện thoại, cùng
        // pattern với src/server/db/seed.ts's seedUsers().
        email: `${params.phoneNumber}@pos.internal`,
        password: params.password,
        name: params.name,
        role: params.role,
        data: {
          phoneNumber: params.phoneNumber,
          phoneNumberVerified: true,
        },
      },
    });
    return toEntity(result.user as RawUser);
  },

  async setRole({ userId, role, headers }: SetUserRoleParams): Promise<UserAccount> {
    const result = await auth.api.setRole({ body: { userId, role }, headers });
    return toEntity(result.user as RawUser);
  },

  async ban({ userId, banReason, headers }: BanUserParams): Promise<UserAccount> {
    const result = await auth.api.banUser({ body: { userId, banReason }, headers });
    return toEntity(result.user as RawUser);
  },

  async unban({ userId, headers }: UnbanUserParams): Promise<UserAccount> {
    const result = await auth.api.unbanUser({ body: { userId }, headers });
    return toEntity(result.user as RawUser);
  },
};
