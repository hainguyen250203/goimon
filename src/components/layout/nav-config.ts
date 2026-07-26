import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Percent,
  Printer,
  Table2,
  Users,
  UtensilsCrossed,
} from "lucide-react";

export type Role = "user" | "manager" | "admin";

const ROLE_RANK: Record<Role, number> = { user: 0, manager: 1, admin: 2 };

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
  minRole?: Extract<Role, "manager" | "admin">;
};

export const ADMIN_NAV: NavItem[] = [
  { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard, href: "/quan-ly" },
  {
    key: "menu",
    label: "Món ăn",
    icon: UtensilsCrossed,
    href: "/quan-ly/mon-an",
    minRole: "manager",
  },
  {
    key: "table",
    label: "Bàn",
    icon: Table2,
    href: "/quan-ly/ban",
    minRole: "manager",
  },
  {
    key: "order",
    label: "Đơn hàng",
    icon: ClipboardList,
    href: "/quan-ly/don-hang",
    minRole: "manager",
  },
  {
    key: "printer",
    label: "Máy in",
    icon: Printer,
    href: "/quan-ly/may-in",
    minRole: "manager",
  },
  {
    key: "promotion",
    label: "Khuyến mãi",
    icon: Percent,
    href: "/quan-ly/khuyen-mai",
    minRole: "manager",
  },
  {
    key: "shift",
    label: "Ca làm việc",
    icon: Clock,
    href: "/quan-ly/ca-lam-viec",
    minRole: "manager",
  },
  {
    key: "user",
    label: "Người dùng",
    icon: Users,
    href: "/quan-ly/nguoi-dung",
    minRole: "admin",
  },
  {
    key: "report",
    label: "Báo cáo",
    icon: BarChart3,
    href: "/quan-ly/bao-cao",
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
