"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ListViewTable,
  type ListViewColumn,
} from "~/components/data-table/list-view-table";
import { ListViewPagination } from "~/components/data-table/list-view-pagination";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { api } from "~/trpc/react";
import type { UserAccount, UserRole } from "~/modules/user/domain/user-account.entity";
import { CreateUserDialog } from "./create-user-dialog";
import { UserRowActions } from "./user-row-actions";

const PAGE_SIZE = 20;
const ALL = "all";

export const ROLE_LABEL: Record<UserRole, string> = {
  user: "Nhân viên",
  manager: "Quản lý",
  admin: "Admin",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date);
}

export function UserList({
  page,
  role,
  banned,
}: {
  page: number;
  role?: UserRole;
  banned?: boolean;
}) {
  const router = useRouter();
  const { data, isFetching } = api.user.list.useQuery(
    { page, pageSize: PAGE_SIZE, role, banned },
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
      cell: (row) => <Badge variant="secondary">{ROLE_LABEL[row.role]}</Badge>,
    },
    {
      key: "banned",
      header: "Trạng thái",
      cell: (row) => (
        <Badge variant={row.banned ? "destructive" : "secondary"}>
          {row.banned ? "Đã cấm" : "Hoạt động"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      cell: (row) => formatDate(row.createdAt),
      className: "text-muted-foreground",
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      cell: (row) => <UserRowActions user={row} />,
    },
  ];

  const buildHref = (params: {
    page?: number;
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
    search.set("page", String(params.page ?? page));
    return `/quan-ly/nguoi-dung?${search.toString()}`;
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ListViewToolbar
        end={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus data-icon="inline-start" />
            Thêm người dùng
          </Button>
        }
      >
        <Select
          value={role ?? ALL}
          onValueChange={(value) => {
            const next = value ?? ALL;
            router.push(
              buildHref({
                page: 1,
                role: next === ALL ? undefined : (next as UserRole),
              }),
            );
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Vai trò">
              {(value: string) =>
                !value || value === ALL
                  ? "Tất cả vai trò"
                  : ROLE_LABEL[value as UserRole]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>Tất cả vai trò</SelectItem>
              <SelectItem value="user">Nhân viên</SelectItem>
              <SelectItem value="manager">Quản lý</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={banned === undefined ? ALL : String(banned)}
          onValueChange={(value) => {
            const next = value ?? ALL;
            router.push(
              buildHref({
                page: 1,
                banned: next === ALL ? undefined : next === "true",
              }),
            );
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Trạng thái">
              {(value: string) =>
                !value || value === ALL
                  ? "Tất cả trạng thái"
                  : value === "true"
                    ? "Đã cấm"
                    : "Hoạt động"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
              <SelectItem value="false">Hoạt động</SelectItem>
              <SelectItem value="true">Đã cấm</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có người dùng nào."
      />
      <ListViewPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => buildHref({ page: p })}
      />

      <CreateUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
