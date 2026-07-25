"use client";

import { useMemo } from "react";
import { createListCollection } from "@chakra-ui/react";

import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";

export type FilterOption = { value: string; label: string };

/**
 * Select đơn giản cho filter/form — bọc createListCollection (API gốc của
 * Chakra Select) để các nơi gọi chỉ cần truyền options dạng {value, label}.
 */
export function FilterSelect({
  options,
  value,
  onValueChange,
  placeholder,
  width,
}: {
  options: FilterOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  width?: string;
}) {
  const collection = useMemo(() => createListCollection({ items: options }), [options]);

  return (
    <SelectRoot
      collection={collection}
      value={value ? [value] : []}
      onValueChange={(details) => onValueChange(details.value[0] ?? "")}
      width={width ?? "auto"}
    >
      <SelectTrigger>
        <SelectValueText placeholder={placeholder} />
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
