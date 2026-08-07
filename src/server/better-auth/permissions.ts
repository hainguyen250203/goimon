import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

// Quyền nghiệp vụ POS (order, menu, printer, quản lý user...) không đi qua ac
// này nữa — enforce hoàn toàn ở permission key theo trang (xem
// src/modules/role/domain/permission-definitions.ts + src/server/api/trpc.ts).
// `roles` map ở đây chỉ còn ý nghĩa lịch sử với `admin()` plugin (ban-enforcement
// lúc đăng nhập, field role/banned trên schema) — role "superadmin" đã bỏ hẳn,
// thay bằng cờ `user.isSuper` (xem CLAUDE.md).
export const user = ac.newRole({});
export const manager = ac.newRole({});
export const viewer = ac.newRole({});
export const admin = ac.newRole({
  ...adminAc.statements,
});
