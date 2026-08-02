"use client";

import { useMemo } from "react";
import { createListCollection } from "@chakra-ui/react";

import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from "~/components/ui/select";

export type ReportSectionKey =
  | "kpi"
  | "revenueByShift"
  | "orderCountByShift"
  | "busyHours"
  | "topItems"
  | "paymentMethod"
  | "categoryRevenue"
  | "promotionUsage";

const SECTION_LABEL: Record<ReportSectionKey, string> = {
  kpi: "Tổng quan (KPI)",
  revenueByShift: "Doanh thu theo ca",
  orderCountByShift: "Số đơn theo ca",
  busyHours: "Giờ bận rộn",
  topItems: "Món bán chạy",
  paymentMethod: "Phương thức thanh toán",
  categoryRevenue: "Doanh thu theo danh mục",
  promotionUsage: "Khuyến mãi đã dùng",
};

export const ALL_REPORT_SECTIONS = Object.keys(SECTION_LABEL) as ReportSectionKey[];

const OPTIONS = ALL_REPORT_SECTIONS.map((value) => ({ value, label: SECTION_LABEL[value] }));

/**
 * Multi-select "phần báo cáo nào muốn xem" — chỉ ẩn/hiện UI, KHÔNG lọc dữ
 * liệu (khác `CategoryFilter`). Cùng pattern Chakra `SelectRoot multiple` với
 * `ui/category-filter.tsx` nhưng options tĩnh (8 mục cố định, không fetch).
 */
export function ReportSectionPicker({
  selected,
  onChange,
}: {
  selected: ReportSectionKey[];
  onChange: (sections: ReportSectionKey[]) => void;
}) {
  const collection = useMemo(() => createListCollection({ items: OPTIONS }), []);

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
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} item={opt}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}
