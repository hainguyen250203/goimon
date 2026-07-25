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
import type { Printer } from "~/modules/printer/domain/printer.entity";
import { PrinterFormDialog } from "./printer-form-dialog";
import { PrinterRowActions } from "./printer-row-actions";

const PAGE_SIZE = 20;
const ALL_STATUS = "all";

function statusToParam(isActive?: boolean) {
  if (isActive === true) return "active";
  if (isActive === false) return "inactive";
  return ALL_STATUS;
}

export function PrinterList({
  page,
  isActive,
}: {
  page: number;
  isActive?: boolean;
}) {
  const router = useRouter();
  const { data, isFetching } = api.printer.list.useQuery(
    { page, pageSize: PAGE_SIZE, isActive },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter. Đã prefetch
    // + hydrate ở Server Component nên lần render đầu luôn có sẵn data.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const [editingItem, setEditingItem] = useState<Printer | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ListViewColumn<Printer>[] = [
    {
      key: "id",
      header: "ID",
      cell: (row) => row.id,
      className: "w-16 text-muted-foreground",
    },
    { key: "name", header: "Tên máy in", cell: (row) => row.name },
    { key: "ipAddress", header: "Địa chỉ IP", cell: (row) => row.ipAddress },
    { key: "port", header: "Cổng", cell: (row) => row.port },
    {
      key: "isActive",
      header: "Trạng thái",
      cell: (row) => (
        <Badge variant={row.isActive ? "secondary" : "outline"}>
          {row.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      cell: (row) => (
        <PrinterRowActions
          item={row}
          onEdit={(item) => {
            setEditingItem(item);
            setDialogOpen(true);
          }}
        />
      ),
    },
  ];

  const buildHref = (params: { page?: number; isActive?: boolean }) => {
    const search = new URLSearchParams();
    // Dùng "in" thay vì "??" — phải phân biệt được "không truyền isActive"
    // (giữ filter hiện tại) với "truyền isActive: undefined" (xoá filter).
    const nextIsActive = "isActive" in params ? params.isActive : isActive;
    const statusParam = statusToParam(nextIsActive);
    if (statusParam !== ALL_STATUS) search.set("status", statusParam);
    search.set("page", String(params.page ?? page));
    return `/quan-ly/may-in?${search.toString()}`;
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ListViewToolbar
        end={
          <Button
            onClick={() => {
              setEditingItem(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Thêm máy in
          </Button>
        }
      >
        <Select
          value={statusToParam(isActive)}
          onValueChange={(value) => {
            router.push(
              buildHref({
                page: 1,
                isActive:
                  value === "active"
                    ? true
                    : value === "inactive"
                      ? false
                      : undefined,
              }),
            );
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Trạng thái">
              {(value: string) =>
                value === "active"
                  ? "Đang hoạt động"
                  : value === "inactive"
                    ? "Ngừng hoạt động"
                    : "Tất cả trạng thái"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_STATUS}>Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Đang hoạt động</SelectItem>
              <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có máy in nào."
      />
      <ListViewPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => buildHref({ page: p })}
      />

      <PrinterFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
      />
    </div>
  );
}
