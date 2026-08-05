import type { UserRole } from "~/modules/user/domain/user-account.entity";

// Tách riêng khỏi user-list.tsx: create-user-dialog.tsx và user-row-actions.tsx
// đều cần ROLE_LABEL, còn user-list.tsx lại import 2 file đó — nếu để chung
// trong user-list.tsx sẽ tạo circular import (ROLE_LABEL bị đọc trước khi
// user-list.tsx evaluate xong, gây lỗi "Cannot access before initialization").
export const ROLE_LABEL: Record<UserRole, string> = {
  user: "Nhân viên",
  manager: "Quản lý",
  admin: "Admin",
  superadmin: "Super Admin",
  viewer: "Người xem",
};

export const ROLE_DOT_COLOR: Record<UserRole, string> = {
  user: "gray.400",
  manager: "blue.500",
  admin: "purple.500",
  superadmin: "red.500",
  viewer: "cyan.500",
};
