import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Gauge,
  ClipboardList,
  Clock,
  Landmark,
  LayoutDashboard,
  Percent,
  Printer,
  ScrollText,
  Table2,
  Users,
  UtensilsCrossed,
} from "lucide-react";

export type Role = "user" | "manager" | "admin" | "superadmin";

const ROLE_RANK: Record<Role, number> = { user: 0, manager: 1, admin: 2, superadmin: 3 };

export type NavItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  /** pathname bắt đầu bằng prefix này cũng tính là active cho item này. */
  pathPrefix?: string;
  children?: NavItem[];
  group?: string;
  /** Vai trò tối thiểu để thấy mục này. Mặc định "manager" (sàn của cả layout /quan-ly). */
  minRole?: Extract<Role, "manager" | "admin" | "superadmin">;
};

// Nhóm theo nghiệp vụ, thứ tự cố định: Tổng quan đứng riêng trên cùng, rồi
// tới "Vận hành" (thao tác ngày qua ngày), "Cấu hình" (thiết lập hệ thống,
// ít đổi), cuối cùng "Quản trị" (admin-only, giám sát/audit) — pattern nhóm
// nav tham khảo từ alix-bo-frontend-v2's lib/nav/nav-admin.ts.
export const ADMIN_NAV: NavItem[] = [
  { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard, href: "/quan-ly" },

  {
    key: "menu",
    label: "Món ăn",
    icon: UtensilsCrossed,
    href: "/quan-ly/mon-an",
    group: "Vận hành",
    minRole: "manager",
  },
  {
    key: "table",
    label: "Bàn",
    icon: Table2,
    href: "/quan-ly/ban",
    group: "Vận hành",
    minRole: "manager",
  },
  {
    key: "order",
    label: "Đơn hàng",
    icon: ClipboardList,
    href: "/quan-ly/don-hang",
    group: "Vận hành",
    minRole: "manager",
  },
  {
    key: "promotion",
    label: "Khuyến mãi",
    icon: Percent,
    href: "/quan-ly/khuyen-mai",
    group: "Vận hành",
    minRole: "manager",
  },
  {
    key: "shift",
    label: "Ca làm việc",
    icon: Clock,
    href: "/quan-ly/ca-lam-viec",
    group: "Vận hành",
    minRole: "manager",
  },

  {
    key: "printer",
    label: "Máy in",
    icon: Printer,
    href: "/quan-ly/may-in",
    group: "Cấu hình",
    minRole: "manager",
  },
  {
    key: "payment-config",
    label: "Thanh toán",
    icon: Landmark,
    href: "/quan-ly/thanh-toan",
    group: "Cấu hình",
    // manager chỉ xem, admin mới sửa được — chặn ở payment-config.router.ts.
    minRole: "manager",
  },

  {
    key: "assistant",
    label: "Trợ lý AI",
    icon: Bot,
    href: "/quan-ly/tro-ly-ai",
    group: "Quản trị",
    minRole: "admin",
  },
  {
    key: "assistant-usage",
    label: "Thống kê AI",
    icon: Gauge,
    href: "/quan-ly/tro-ly-ai/thong-ke",
    group: "Quản trị",
    minRole: "admin",
  },
  {
    key: "user",
    label: "Người dùng",
    icon: Users,
    href: "/quan-ly/nguoi-dung",
    group: "Quản trị",
    minRole: "admin",
  },
  {
    key: "activity-log",
    label: "Nhật ký hoạt động",
    icon: ScrollText,
    href: "/quan-ly/nhat-ky-hoat-dong",
    group: "Quản trị",
    // Chỉ superadmin — vai trò giám sát toàn hệ thống, admin không còn xem
    // được nhật ký hoạt động nữa (xem CLAUDE.md).
    minRole: "superadmin",
  },
  {
    key: "report",
    label: "Báo cáo",
    icon: BarChart3,
    href: "/quan-ly/bao-cao",
    group: "Quản trị",
    minRole: "admin",
  },
];

/**
 * Lọc nav theo role: giữ item mà role hiện tại đủ quyền (>= minRole), lọc đệ
 * quy xuống children, rồi drop luôn item cha nếu không còn con nào hợp lệ.
 * Pattern giống hệt `buildAdminNav` tham khảo từ alix-bo-frontend-v2.
 */
export function filterNavByRole(nav: NavItem[], role: Role): NavItem[] {
  const rank = ROLE_RANK[role];
  return nav
    .filter((item) => rank >= ROLE_RANK[item.minRole ?? "manager"])
    .map((item) => ({
      ...item,
      children: item.children
        ? filterNavByRole(item.children, role)
        : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}
