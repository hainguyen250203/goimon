"use client";

import { useMemo } from "react";
import { createListCollection } from "@chakra-ui/react";

import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from "~/components/ui/select";

/**
 * Multi-select chọn danh mục cho "Món bán chạy"/"Doanh thu theo danh mục" ở
 * trang Báo cáo — để bỏ bớt danh mục không cần khỏi 2 biểu đồ đó. Không cho
 * bỏ chọn hết (báo cáo trống vô nghĩa) — xử lý ở nơi gọi (report-filters.tsx).
 */
export function CategoryFilter({
  categories,
  selected,
  onChange,
}: {
  categories: { id: number; name: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const options = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const collection = useMemo(() => createListCollection({ items: options }), [options]);

  return (
    <SelectRoot
      multiple
      size="sm"
      collection={collection}
      value={selected.map(String)}
      onValueChange={(details) => onChange(details.value.map(Number))}
    >
      <SelectTrigger>
        <SelectValueText placeholder="Tất cả danh mục" />
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
