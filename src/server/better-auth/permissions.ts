import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

// Quản lý tài khoản (tạo/khóa/đổi role qua BetterAuth admin API) chỉ dành cho admin.
// Quyền nghiệp vụ POS (order, menu, printer...) không đi qua ac này — enforce ở
// tRPC role hierarchy (xem src/server/api/trpc.ts).
export const user = ac.newRole({});
export const manager = ac.newRole({});
export const admin = ac.newRole({
  ...adminAc.statements,
});
