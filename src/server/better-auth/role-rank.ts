// Bản rank dùng cho các page-guard đơn giản (server component check
// `session.user.role`) — KHÔNG thay thế 3 định nghĩa Role/ROLE_RANK đã có
// (trpc.ts cho tRPC procedure, nav-config.ts cho lọc sidebar,
// user-account.entity.ts's UserRole cho module user) vì mỗi nơi phục vụ mục
// đích khác nhau; đây chỉ gộp lại logic ">= minRole" đang bị lặp ở nhiều
// page.tsx (nguoi-dung, tro-ly-ai, bao-cao, thanh-toan...) để tránh bỏ sót khi
// có role thứ 5 sau này.
const ROLE_RANK = { user: 0, manager: 1, admin: 2, superadmin: 3 } as const;

export function hasMinRole(
  role: string | null | undefined,
  minRole: keyof typeof ROLE_RANK,
): boolean {
  const rank = ROLE_RANK[(role ?? "user") as keyof typeof ROLE_RANK] ?? 0;
  return rank >= ROLE_RANK[minRole];
}
