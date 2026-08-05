"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData } from "@tanstack/react-query";
import { Badge, Button, Stack } from "@chakra-ui/react";
import { Plus, ScanSearch } from "lucide-react";

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
import type { PrinterScanResult } from "~/modules/printer/domain/printer-scanner";
import { PrinterFormDialog } from "./printer-form-dialog";
import { PrinterRowActions } from "./printer-row-actions";
import { PrinterScanDialog } from "./printer-scan-dialog";

const ALL_STATUS = "all";

function statusToParam(isActive?: boolean) {
  if (isActive === true) return "active";
  if (isActive === false) return "inactive";
  return ALL_STATUS;
}

export function PrinterList({
  page,
  pageSize,
  isActive,
  canManage,
}: {
  page: number;
  pageSize: number;
  isActive?: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const { data, isFetching } = api.printer.list.useQuery(
    { page, pageSize, isActive },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter. Đã prefetch
    // + hydrate ở Server Component nên lần render đầu luôn có sẵn data.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const [editingItem, setEditingItem] = useState<Printer | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<PrinterScanResult | undefined>();

  const columns: ListViewColumn<Printer>[] = [
    { key: "id", header: "ID", cell: (row) => row.id, width: "4rem" },
    { key: "name", header: "Tên máy in", cell: (row) => row.name },
    { key: "ipAddress", header: "Địa chỉ IP", cell: (row) => row.ipAddress },
    { key: "port", header: "Cổng", cell: (row) => row.port },
    {
      key: "type",
      header: "Loại",
      cell: (row) => (
        <Badge colorPalette={row.type === "kitchen" ? "purple" : "blue"} variant="subtle" size="sm">
          {row.type === "kitchen" ? "Bếp" : "Hoá đơn"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Trạng thái",
      cell: (row) => (
        <StatusDot color={row.isActive ? "green.500" : "gray.400"}>
          {row.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
        </StatusDot>
      ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            width: "3rem",
            cell: (row: Printer) => (
              <PrinterRowActions
                item={row}
                onEdit={(item) => {
                  setEditingItem(item);
                  setDialogOpen(true);
                }}
              />
            ),
          } satisfies ListViewColumn<Printer>,
        ]
      : []),
  ];

  const buildHref = (params: { page?: number; pageSize?: number; isActive?: boolean }) => {
    const search = new URLSearchParams();
    // Dùng "in" thay vì "??" — phải phân biệt được "không truyền isActive"
    // (giữ filter hiện tại) với "truyền isActive: undefined" (xoá filter).
    const nextIsActive = "isActive" in params ? params.isActive : isActive;
    const statusParam = statusToParam(nextIsActive);
    if (statusParam !== ALL_STATUS) search.set("status", statusParam);
    search.set("pageSize", String(params.pageSize ?? pageSize));
    search.set("page", String(params.page ?? page));
    return `/quan-ly/may-in?${search.toString()}`;
  };

  return (
    <Stack gap={4}>
      <ListViewToolbar
        end={
          canManage && (
            <>
              <Button variant="outline" onClick={() => setScanDialogOpen(true)}>
                <ScanSearch size={16} />
                Quét tìm máy in
              </Button>
              <Button
                onClick={() => {
                  setEditingItem(undefined);
                  setPrefill(undefined);
                  setDialogOpen(true);
                }}
              >
                <Plus size={16} />
                Thêm máy in
              </Button>
            </>
          )
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
      <ListViewPagination page={page} pageSize={pageSize} total={total} buildHref={buildHref} />

      <PrinterFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        prefill={prefill}
      />

      <PrinterScanDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        existingIpAddresses={items.map((item) => item.ipAddress)}
        onPick={(result) => {
          setScanDialogOpen(false);
          setEditingItem(undefined);
          setPrefill(result);
          setDialogOpen(true);
        }}
      />
    </Stack>
  );
}
