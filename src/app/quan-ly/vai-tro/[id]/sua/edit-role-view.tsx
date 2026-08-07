"use client";

import { Text } from "@chakra-ui/react";

import { api } from "~/trpc/react";
import { RoleForm } from "../../role-form";

/** Danh sách vai trò rất ít (đếm được trên đầu ngón tay) nên lấy lại từ
 * `role.list` (đã cache sẵn từ trang danh sách) rồi tìm theo id thay vì thêm
 * hẳn 1 usecase/endpoint `get` riêng chỉ để đọc 1 dòng. */
export function EditRoleView({ id }: { id: number }) {
  const [items] = api.role.list.useSuspenseQuery();
  const item = items.find((r) => r.id === id);

  if (!item) {
    return (
      <Text fontSize="sm" color="fg.muted">
        Không tìm thấy vai trò.
      </Text>
    );
  }

  return <RoleForm item={item} />;
}
