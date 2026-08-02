"use client";

import { useMemo, useState } from "react";
import { createListCollection } from "@chakra-ui/react";

import {
  ComboboxContent,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemText,
  ComboboxRoot,
} from "~/components/ui/combobox";
import type { FilterOption } from "./filter-field.type";

/**
 * Combobox filter tổng quát — nhận sẵn `options` (trang gọi tự fetch xong,
 * vd `api.user.list`), tự lọc client-side theo input gõ vào. Tham khảo
 * `FilterCombobox` của alix-bo-frontend-v2. Cùng "hình dạng" prop với
 * `FilterSelect` (`options`/`value`/`onValueChange`) để `FilterFieldInput`
 * hoán đổi được 2 component này theo `field.variant`.
 */
export function FilterCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  width,
  size = "sm",
}: {
  options: FilterOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  width?: string;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const [inputValue, setInputValue] = useState("");

  const filtered = useMemo(() => {
    if (!inputValue) return options;
    const q = inputValue.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, inputValue]);

  const collection = useMemo(() => createListCollection({ items: filtered }), [filtered]);

  return (
    <ComboboxRoot
      collection={collection}
      value={value ? [value] : []}
      onValueChange={(details) => onValueChange(details.value[0] ?? "")}
      onInputValueChange={(details) => setInputValue(details.inputValue)}
      onOpenChange={(details) => {
        if (!details.open) setInputValue("");
      }}
      openOnClick
      width={width}
      size={size}
    >
      <ComboboxControl clearable>
        <ComboboxInput placeholder={placeholder} />
      </ComboboxControl>
      <ComboboxContent>
        <ComboboxEmpty>Không tìm thấy.</ComboboxEmpty>
        {filtered.map((opt) => (
          <ComboboxItem key={opt.value} item={opt}>
            <ComboboxItemText>{opt.label}</ComboboxItemText>
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </ComboboxRoot>
  );
}
