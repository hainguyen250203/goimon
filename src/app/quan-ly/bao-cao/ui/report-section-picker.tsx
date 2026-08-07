"use client";

import { useMemo } from "react";
import { createListCollection } from "@chakra-ui/react";

import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from "~/components/ui/select";
import type { PermissionKey } from "~/modules/role/domain/permission-definitions";

export type ReportSectionKey =
  | "kpi"
  | "shiftDetailCards"
  | "topItems"
  | "paymentMethod"
  | "categoryRevenue"
  | "promotionUsage";

const SECTION_LABEL: Record<ReportSectionKey, string> = {
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

/**
 * Multi-select "phần báo cáo nào muốn xem" — chỉ ẩn/hiện UI, KHÔNG lọc dữ
 * liệu (khác `CategoryFilter`). Cùng pattern Chakra `SelectRoot multiple` với
 * `ui/category-filter.tsx` nhưng options tĩnh (8 mục cố định, không fetch).
 * `allowedSections` giới hạn options theo quyền của role — phần không có
 * quyền không được liệt kê ra để chọn (khác `selected`, chỉ là sở thích
 * hiển thị cá nhân trong phạm vi được phép).
 */
export function ReportSectionPicker({
  selected,
  onChange,
  allowedSections,
}: {
  selected: ReportSectionKey[];
  onChange: (sections: ReportSectionKey[]) => void;
  allowedSections: ReportSectionKey[];
}) {
  const options = useMemo(
    () => allowedSections.map((value) => ({ value, label: SECTION_LABEL[value] })),
    [allowedSections],
  );
  const collection = useMemo(() => createListCollection({ items: options }), [options]);

  return (
    <SelectRoot
      multiple
      size="sm"
      collection={collection}
      value={selected}
      onValueChange={(details) => onChange(details.value as ReportSectionKey[])}
    >
      <SelectTrigger>
        <SelectValueText placeholder="Chọn phần báo cáo" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} item={opt}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}
