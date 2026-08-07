"use client";

import NextLink from "next/link";
import { Button, Stack } from "@chakra-ui/react";
import { Plus } from "lucide-react";

import {
  ListViewTable,
  type ListViewColumn,
} from "~/components/data-table/list-view-table";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { api } from "~/trpc/react";
import type { Role } from "~/modules/role/domain/role.entity";
import { RoleRowActions } from "./role-row-actions";

export function RoleList({
  canCreate,
  canEdit,
  canDelete,
}: {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { data, isFetching } = api.role.list.useQuery();
  const items = data ?? [];

  const columns: ListViewColumn<Role>[] = [
    { key: "name", header: "Tên vai trò", cell: (row) => row.name },
    { key: "description", header: "Mô tả", cell: (row) => row.description ?? "—" },
    {
      key: "permissions",
      header: "Số quyền",
      cell: (row) => String(row.permissions.length),
      textAlign: "right",
      width: "6rem",
    },
    ...(canEdit || canDelete
      ? [
          {
            key: "actions",
            header: "",
            width: "3rem",
            cell: (row: Role) => (
              <RoleRowActions item={row} canEdit={canEdit} canDelete={canDelete} />
            ),
          } satisfies ListViewColumn<Role>,
        ]
      : []),
  ];

  return (
    <Stack gap={4}>
      <ListViewToolbar
        end={
          canCreate && (
            <Button asChild>
              <NextLink href="/quan-ly/vai-tro/tao-moi">
                <Plus size={16} />
                Thêm vai trò
              </NextLink>
            </Button>
          )
        }
      >
        {null}
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có vai trò nào."
      />
    </Stack>
  );
}
