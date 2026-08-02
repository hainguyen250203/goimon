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
type UserRole = "user" | "manager" | "admin" | "superadmin";

/**
 * Combobox lọc theo người dùng — tải toàn bộ danh sách 1 lần (số lượng nhỏ
 * trong 1 quán) rồi lọc client-side, không cần search server. `role` để
 * thu hẹp danh sách khi chỉ 1 nhóm role có liên quan (vd chỉ admin mới có
 * phiên chat AI); bỏ trống để liệt kê mọi người dùng.
 */
export function UserFilterCombobox({
  value,
  onValueChange,
  role,
  placeholder = "Lọc theo người dùng...",
  width = "16rem",
}: {
  value: string;
  onValueChange: (userId: string) => void;
  role?: UserRole;
  placeholder?: string;
  width?: string;
}) {
  const { data } = api.user.list.useQuery({ role, pageSize: MAX_PAGE_SIZE });
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
      width={width}
      size="sm"
    >
      <ComboboxControl clearable>
        <ComboboxInput placeholder={placeholder} />
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
