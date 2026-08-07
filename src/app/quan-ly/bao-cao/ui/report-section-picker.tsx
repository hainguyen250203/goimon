"use client";

import { useMemo } from "react";
import { createListCollection } from "@chakra-ui/react";

import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from "~/components/ui/select";
import { SECTION_LABEL, type ReportSectionKey } from "./report-sections";

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
