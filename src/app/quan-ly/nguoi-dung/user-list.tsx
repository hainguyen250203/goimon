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
import type { UserAccount, UserRole } from "~/modules/user/domain/user-account.entity";
import { CreateUserDialog } from "./create-user-dialog";
import { UserRowActions } from "./user-row-actions";
import { ROLE_DOT_COLOR, ROLE_LABEL } from "./role-label";

const ALL = "all";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date);
}

export function UserList({
  page,
  pageSize,
  role,
  banned,
  viewerRole,
}: {
  page: number;
  pageSize: number;
  role?: UserRole;
  banned?: boolean;
  /** Role của người đang xem trang này — chỉ superadmin mới gán được
   * superadmin cho người khác (xem create-user-dialog.tsx/user-row-actions.tsx). */
  viewerRole: UserRole;
}) {
  const router = useRouter();
  const { data, isFetching } = api.user.list.useQuery(
    { page, pageSize, role, banned },
    // Giữ data trang cũ trong lúc fetch trang/filter mới — tránh nháy
    // skeleton. Đã prefetch + hydrate ở Server Component nên lần render
    // đầu luôn có sẵn data.
    { placeholderData: keepPreviousData },
  );
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
        <StatusDot color={ROLE_DOT_COLOR[row.role]}>{ROLE_LABEL[row.role]}</StatusDot>
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
    {
      key: "actions",
      header: "",
      width: "3rem",
      cell: (row) => <UserRowActions user={row} viewerRole={viewerRole} />,
    },
  ];

  const buildHref = (params: {
    page?: number;
    pageSize?: number;
    role?: UserRole;
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
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} />
            Thêm người dùng
          </Button>
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
                role: value === ALL ? undefined : (value as UserRole),
              }),
            )
          }
          options={[
            { value: ALL, label: "Tất cả vai trò" },
            { value: "user", label: "Nhân viên" },
            { value: "manager", label: "Quản lý" },
            { value: "admin", label: "Admin" },
            // superadmin là vai trò giám sát ẨN — không lộ ra dropdown filter
            // (cũng như dropdown gán role) với ai không phải chính superadmin,
            // kể cả dạng "chỉ để xem" (xem user.router.ts's list()).
            ...(viewerRole === "superadmin"
              ? [{ value: "superadmin", label: "Super Admin" }]
              : []),
          ]}
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

      <CreateUserDialog open={dialogOpen} onOpenChange={setDialogOpen} viewerRole={viewerRole} />
    </Stack>
  );
}
