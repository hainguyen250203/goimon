"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData } from "@tanstack/react-query";
import { Button, Stack } from "@chakra-ui/react";
import { Plus } from "lucide-react";

import {
  ListViewTable,
  type ListViewColumn,
} from "~/components/data-table/list-view-table";
import { ListViewPagination } from "~/components/data-table/list-view-pagination";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { FilterSelect } from "~/components/data-table/filter-select";
import { StatusDot } from "~/components/ui/status-dot";
import { api } from "~/trpc/react";
import type { UserAccount } from "~/modules/user/domain/user-account.entity";
import { CreateUserDialog } from "./create-user-dialog";
import { UserRowActions } from "./user-row-actions";
import { getRoleDotColor, getRoleLabel } from "./role-label";

const ALL = "all";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" }).format(date);
}

export function UserList({
  page,
  pageSize,
  role,
  banned,
  canCreate,
  canSetRole,
  canBanUnban,
  canResetPassword,
}: {
  page: number;
  pageSize: number;
  role?: string;
  banned?: boolean;
  canCreate: boolean;
  canSetRole: boolean;
  canBanUnban: boolean;
  canResetPassword: boolean;
}) {
  const canManageRow = canSetRole || canBanUnban || canResetPassword;
  const router = useRouter();
  const { data, isFetching } = api.user.list.useQuery(
    { page, pageSize, role, banned },
    // Giữ data trang cũ trong lúc fetch trang/filter mới — tránh nháy
    // skeleton. Đã prefetch + hydrate ở Server Component nên lần render
    // đầu luôn có sẵn data.
    { placeholderData: keepPreviousData },
  );
  const { data: roles } = api.role.listOptions.useQuery();
  const roleOptions = (roles ?? []).map((r) => ({ value: r.name, label: getRoleLabel(r.name) }));
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ListViewColumn<UserAccount>[] = [
    { key: "name", header: "Tên", cell: (row) => row.name },
    {
      key: "phoneNumber",
      header: "Số điện thoại",
      cell: (row) => row.phoneNumber ?? "—",
    },
    {
      key: "role",
      header: "Vai trò",
      cell: (row) => (
        <StatusDot color={getRoleDotColor(row.role)}>{getRoleLabel(row.role)}</StatusDot>
      ),
    },
    {
      key: "banned",
      header: "Trạng thái",
      cell: (row) => (
        <StatusDot color={row.banned ? "red.500" : "green.500"}>
          {row.banned ? "Đã cấm" : "Hoạt động"}
        </StatusDot>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      cell: (row) => formatDate(row.createdAt),
    },
    ...(canManageRow
      ? [
          {
            key: "actions",
            header: "",
            width: "3rem",
            cell: (row: UserAccount) => (
              <UserRowActions
                user={row}
                roleOptions={roleOptions}
                canSetRole={canSetRole}
                canBanUnban={canBanUnban}
                canResetPassword={canResetPassword}
              />
            ),
          } satisfies ListViewColumn<UserAccount>,
        ]
      : []),
  ];

  const buildHref = (params: {
    page?: number;
    pageSize?: number;
    role?: string;
    banned?: boolean;
  }) => {
    const search = new URLSearchParams();
    // Dùng "in" thay vì "??" — phải phân biệt "không truyền" (giữ filter
    // hiện tại) với "truyền undefined" (xoá filter) — giống pattern buildHref
    // của menu-item-list.tsx.
    const nextRole = "role" in params ? params.role : role;
    const nextBanned = "banned" in params ? params.banned : banned;
    if (nextRole) search.set("role", nextRole);
    if (nextBanned !== undefined) search.set("banned", String(nextBanned));
    search.set("pageSize", String(params.pageSize ?? pageSize));
    search.set("page", String(params.page ?? page));
    return `/quan-ly/nguoi-dung?${search.toString()}`;
  };

  return (
    <Stack gap={4}>
      <ListViewToolbar
        end={
          canCreate && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={16} />
              Thêm người dùng
            </Button>
          )
        }
      >
        <FilterSelect
          width="12rem"
          placeholder="Vai trò"
          value={role ?? ALL}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                role: value === ALL ? undefined : value,
              }),
            )
          }
          options={[{ value: ALL, label: "Tất cả vai trò" }, ...roleOptions]}
        />

        <FilterSelect
          width="12rem"
          placeholder="Trạng thái"
          value={banned === undefined ? ALL : String(banned)}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                banned: value === ALL ? undefined : value === "true",
              }),
            )
          }
          options={[
            { value: ALL, label: "Tất cả trạng thái" },
            { value: "false", label: "Hoạt động" },
            { value: "true", label: "Đã cấm" },
          ]}
        />
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có người dùng nào."
      />
      <ListViewPagination page={page} pageSize={pageSize} total={total} buildHref={buildHref} />

      {canCreate && (
        <CreateUserDialog open={dialogOpen} onOpenChange={setDialogOpen} roleOptions={roleOptions} />
      )}
    </Stack>
  );
}
