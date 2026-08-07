// Role giờ là dữ liệu tự do (bảng `role`, quản lý qua trang Vai trò) — chỉ
// còn nhãn/màu đẹp cho 4 role mặc định, role tuỳ biến khác hiện thẳng tên đã
// đặt (không có khái niệm nhãn tiếng Việt riêng, admin tự đặt tên rõ ràng
// ngay từ đầu ở trang Vai trò).
const KNOWN_ROLE_LABEL: Record<string, string> = {
  user: "Nhân viên",
  manager: "Quản lý",
  admin: "Admin",
  viewer: "Người xem",
};

const KNOWN_ROLE_DOT_COLOR: Record<string, string> = {
  user: "gray.400",
  manager: "blue.500",
  admin: "purple.500",
  viewer: "cyan.500",
};

export function getRoleLabel(role: string): string {
  return KNOWN_ROLE_LABEL[role] ?? role;
}

export function getRoleDotColor(role: string): string {
  return KNOWN_ROLE_DOT_COLOR[role] ?? "gray.400";
}
