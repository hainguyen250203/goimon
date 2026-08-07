import type { PermissionKey } from "~/modules/role/domain/permission-definitions";

// File THUẦN (không "use client") — Server Component (page.tsx) cần import
// trực tiếp các hằng số này. Nếu để chung trong report-section-picker.tsx
// (có "use client"), Turbopack biến MỌI export của file đó (kể cả data thuần
// như mảng/object) thành client-reference khi Server Component import vào,
// gây lỗi runtime "ALL_REPORT_SECTIONS.filter is not a function" (data không
// còn là giá trị JS thật nữa, chỉ component mới render qua boundary đó được).

export type ReportSectionKey =
  | "kpi"
  | "shiftDetailCards"
  | "topItems"
  | "paymentMethod"
  | "categoryRevenue"
  | "promotionUsage";

export const SECTION_LABEL: Record<ReportSectionKey, string> = {
  kpi: "Tổng quan (KPI)",
  shiftDetailCards: "Chi tiết theo ca",
  topItems: "Món bán chạy",
  paymentMethod: "Phương thức thanh toán",
  categoryRevenue: "Doanh thu theo danh mục",
  promotionUsage: "Khuyến mãi đã dùng",
};

/** Mỗi section ứng đúng 1 action key trong permission-definitions.ts's trang
 * "bao-cao" — dùng để tính `allowedSections` ở page.tsx (Server Component,
 * nơi duy nhất gọi được `hasPermission`). */
export const SECTION_PERMISSION_KEY: Record<ReportSectionKey, PermissionKey> = {
  kpi: "bao-cao.tong-quan",
  shiftDetailCards: "bao-cao.chi-tiet-ca",
  topItems: "bao-cao.mon-ban-chay",
  paymentMethod: "bao-cao.phuong-thuc-thanh-toan",
  categoryRevenue: "bao-cao.danh-muc",
  promotionUsage: "bao-cao.khuyen-mai",
};

export const ALL_REPORT_SECTIONS = Object.keys(SECTION_LABEL) as ReportSectionKey[];
