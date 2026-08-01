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
import { api } from "~/trpc/react";
import { MAX_PAGE_SIZE } from "~/lib/pagination";

type UserOption = { value: string; label: string };

/**
 * Chỉ AI (`minRole: "admin"`, xem nav-config.ts) mới có phiên chat để giám
 * sát, nên combobox chỉ liệt kê user role admin — số lượng nhỏ trong 1 quán,
 * tải 1 lần rồi lọc client-side, không cần search server.
 */
export function UserFilterCombobox({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (userId: string) => void;
}) {
  const { data } = api.user.list.useQuery({ role: "admin", pageSize: MAX_PAGE_SIZE });
  const [inputValue, setInputValue] = useState("");

  const options: UserOption[] = useMemo(
    () =>
      (data?.items ?? []).map((u) => ({
        value: u.id,
        label: u.phoneNumber ? `${u.name} · ${u.phoneNumber}` : u.name,
      })),
    [data],
  );

  const collection = useMemo(() => {
    const filtered = inputValue
      ? options.filter((opt) => opt.label.toLowerCase().includes(inputValue.toLowerCase()))
      : options;
    return createListCollection({ items: filtered });
  }, [options, inputValue]);

  return (
    <ComboboxRoot
      collection={collection}
      value={value ? [value] : []}
      onValueChange={(details) => onValueChange(details.value[0] ?? "")}
      onInputValueChange={(details) => setInputValue(details.inputValue)}
      openOnClick
      width="16rem"
      size="sm"
    >
      <ComboboxControl clearable>
        <ComboboxInput placeholder="Lọc theo admin..." />
      </ComboboxControl>
      <ComboboxContent>
        <ComboboxEmpty>Không tìm thấy user.</ComboboxEmpty>
        {collection.items.map((opt) => (
          <ComboboxItem key={opt.value} item={opt}>
            <ComboboxItemText>{opt.label}</ComboboxItemText>
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </ComboboxRoot>
  );
}
