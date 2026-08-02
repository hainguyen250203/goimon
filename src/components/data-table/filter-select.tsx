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
import type { FilterOption } from "./filter-field.type";

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
  size,
}: {
  options: FilterOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  width?: string;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const collection = useMemo(() => createListCollection({ items: options }), [options]);

  return (
    <SelectRoot
      collection={collection}
      value={value ? [value] : []}
      onValueChange={(details) => onValueChange(details.value[0] ?? "")}
      width={width ?? "auto"}
      size={size}
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
