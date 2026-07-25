"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    { key: "id", header: "ID", cell: (row) => row.id, width: "4rem" },
    { key: "name", header: "Tên máy in", cell: (row) => row.name },
    { key: "ipAddress", header: "Địa chỉ IP", cell: (row) => row.ipAddress },
    { key: "port", header: "Cổng", cell: (row) => row.port },
    {
      key: "isActive",
      header: "Trạng thái",
      cell: (row) => (
        <StatusDot color={row.isActive ? "green.500" : "gray.400"}>
          {row.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
        </StatusDot>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "3rem",
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
    <Stack gap={4}>
      <ListViewToolbar
        end={
          <Button
            onClick={() => {
              setEditingItem(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus size={16} />
            Thêm máy in
          </Button>
        }
      >
        <FilterSelect
          width="14rem"
          placeholder="Trạng thái"
          value={statusToParam(isActive)}
          onValueChange={(value) =>
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
            )
          }
          options={[
            { value: ALL_STATUS, label: "Tất cả trạng thái" },
            { value: "active", label: "Đang hoạt động" },
            { value: "inactive", label: "Ngừng hoạt động" },
          ]}
        />
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
    </Stack>
  );
}
