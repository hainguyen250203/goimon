import type { UserAccount, UserRole } from "./user-account.entity";

/**
 * `headers` xuất hiện trong các param type dưới đây không phải chi tiết
 * BetterAuth — `Headers` là type chuẩn của Web Fetch API, có sẵn trong
 * `createTRPCContext` (xem src/server/api/trpc.ts). Interface này chỉ định
 * nghĩa "cần truyền headers của request xuống" mà không biết implementation
 * infra sẽ dùng nó để làm gì (BetterAuth admin API cần headers để xác thực
 * phiên đăng nhập của người thực hiện thao tác).
 */
export type ListUsersParams = {
  page: number;
  pageSize: number;
  role?: UserRole;
  banned?: boolean;
  headers: Headers;
};

export type ListUsersResult = {
  items: UserAccount[];
  total: number;
};

export type CreateUserParams = {
  name: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
};

export type SetUserRoleParams = {
  userId: string;
  role: UserRole;
  headers: Headers;
};

export type BanUserParams = {
  userId: string;
  banReason?: string;
  headers: Headers;
};

export type UnbanUserParams = {
  userId: string;
  headers: Headers;
};

export type SetUserPasswordParams = {
  userId: string;
  newPassword: string;
  headers: Headers;
};

export type GetUserByIdParams = {
  userId: string;
  headers: Headers;
};

export interface UserRepository {
  list(params: ListUsersParams): Promise<ListUsersResult>;
  /** Dùng để lấy snapshot "before" khi ghi activity log lúc setRole/ban/unban. */
  getById(params: GetUserByIdParams): Promise<UserAccount>;
  create(params: CreateUserParams): Promise<UserAccount>;
  setRole(params: SetUserRoleParams): Promise<UserAccount>;
  ban(params: BanUserParams): Promise<UserAccount>;
  unban(params: UnbanUserParams): Promise<UserAccount>;
  /** Admin đặt lại mật khẩu cho user khác — không cần mật khẩu cũ (khác đổi mật khẩu tự thân). */
  setPassword(params: SetUserPasswordParams): Promise<void>;
}
