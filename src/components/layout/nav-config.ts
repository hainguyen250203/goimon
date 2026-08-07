import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Gauge,
  History,
  ClipboardList,
  Clock,
  Landmark,
  LayoutDashboard,
  Percent,
  Printer,
  ScrollText,
  ShieldCheck,
  Table2,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import type { PermissionKey } from "~/modules/role/domain/permission-definitions";
import type { ResolvedPermissions } from "~/modules/role/get-my-permissions";

export type NavItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  /** pathname bắt đầu bằng prefix này cũng tính là active cho item này. */
  pathPrefix?: string;
  children?: NavItem[];
  group?: string;
  /** Permission key `.get` cần có để thấy mục này. Bỏ trống = luôn thấy
   * (vd "Tổng quan"). */
  getKey?: PermissionKey;
  /** Chỉ hiện khi `isSuper` — dành riêng Nhật ký hoạt động/Lịch sử trò
   * chuyện AI, nằm ngoài hệ thống permission-key hẳn (xem CLAUDE.md). */
  superOnly?: boolean;
};

// Nhóm theo nghiệp vụ, thứ tự cố định: Tổng quan đứng riêng trên cùng, rồi
// tới "Vận hành" (thao tác ngày qua ngày), "Cấu hình" (thiết lập hệ thống,
// ít đổi), "Trợ lý AI" (tách riêng khỏi Quản trị cho dễ tìm — vẫn admin-only
// qua getKey/superOnly), cuối cùng "Quản trị" (người dùng/vai trò/nhật ký/báo
// cáo) — pattern nhóm nav tham khảo từ alix-bo-frontend-v2's lib/nav/nav-admin.ts.
export const ADMIN_NAV: NavItem[] = [
  {
    key: "dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    href: "/quan-ly",
    getKey: "dashboard.get",
  },

  {
    key: "menu",
    label: "Món ăn",
    icon: UtensilsCrossed,
    href: "/quan-ly/mon-an",
    group: "Vận hành",
    getKey: "mon-an.get",
  },
  {
    key: "table",
    label: "Bàn",
    icon: Table2,
    href: "/quan-ly/ban",
    group: "Vận hành",
    getKey: "ban.get",
  },
  {
    key: "order",
    label: "Đơn hàng",
    icon: ClipboardList,
    href: "/quan-ly/don-hang",
    group: "Vận hành",
    getKey: "don-hang.get",
  },
  {
    key: "promotion",
    label: "Khuyến mãi",
    icon: Percent,
    href: "/quan-ly/khuyen-mai",
    group: "Vận hành",
    getKey: "khuyen-mai.get",
  },
  {
    key: "shift",
    label: "Ca làm việc",
    icon: Clock,
    href: "/quan-ly/ca-lam-viec",
    group: "Vận hành",
    getKey: "ca-lam-viec.get",
  },

  {
    key: "printer",
    label: "Máy in",
    icon: Printer,
    href: "/quan-ly/may-in",
    group: "Cấu hình",
    getKey: "may-in.get",
  },
  {
    key: "payment-config",
    label: "Thanh toán",
    icon: Landmark,
    href: "/quan-ly/thanh-toan",
    group: "Cấu hình",
    getKey: "thanh-toan.get",
  },

  {
    key: "assistant",
    label: "Trợ lý AI",
    icon: Bot,
    href: "/quan-ly/tro-ly-ai",
    group: "Trợ lý AI",
    getKey: "tro-ly-ai.get",
  },
  {
    key: "assistant-usage",
    label: "Thống kê AI",
    icon: Gauge,
    href: "/quan-ly/tro-ly-ai/thong-ke",
    group: "Trợ lý AI",
    getKey: "tro-ly-ai-thong-ke.get",
  },
  {
    key: "assistant-history",
    label: "Lịch sử trò chuyện AI",
    icon: History,
    href: "/quan-ly/tro-ly-ai/lich-su",
    group: "Trợ lý AI",
    // Chỉ isSuper — xem được lịch sử chat AI của MỌI user, khác trang "Trợ lý
    // AI" (chỉ chat của chính người đang đăng nhập). Nằm ngoài permission-key.
    superOnly: true,
  },
  {
    key: "user",
    label: "Người dùng",
    icon: Users,
    href: "/quan-ly/nguoi-dung",
    group: "Quản trị",
    getKey: "nguoi-dung.get",
  },
  {
    key: "role",
    label: "Vai trò",
    icon: ShieldCheck,
    href: "/quan-ly/vai-tro",
    group: "Quản trị",
    getKey: "vai-tro.get",
  },
  {
    key: "activity-log",
    label: "Nhật ký hoạt động",
    icon: ScrollText,
    href: "/quan-ly/nhat-ky-hoat-dong",
    group: "Quản trị",
    getKey: "nhat-ky-hoat-dong.get",
  },
  {
    key: "report",
    label: "Báo cáo",
    icon: BarChart3,
    href: "/quan-ly/bao-cao",
    group: "Quản trị",
    getKey: "bao-cao.get",
  },
];

/**
 * Lọc nav theo permission đã resolve: giữ item mà role hiện tại có đúng
 * `getKey` (hoặc `isSuper`/`superOnly` khớp), lọc đệ quy xuống children, rồi
 * drop luôn item cha nếu không còn con nào hợp lệ. Pattern giống hệt
 * `buildAdminNav` tham khảo từ alix-bo-frontend-v2.
 */
export function filterNavByRole(nav: NavItem[], permissions: ResolvedPermissions): NavItem[] {
  const canSee = (item: NavItem) => {
    if (item.superOnly) return permissions.isSuper;
    if (!item.getKey) return true;
    return permissions.isSuper || permissions.keys.includes(item.getKey);
  };
  return nav
    .filter(canSee)
    .map((item) => ({
      ...item,
      children: item.children ? filterNavByRole(item.children, permissions) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}
