"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData } from "@tanstack/react-query";
import { Button, Stack } from "@chakra-ui/react";
import { Plus, Settings } from "lucide-react";
import { StatusDot } from "~/components/ui/status-dot";

import {
  ListViewTable,
  type ListViewColumn,
} from "~/components/data-table/list-view-table";
import { ListViewPagination } from "~/components/data-table/list-view-pagination";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { FilterSelect } from "~/components/data-table/filter-select";
import { ManageListDialog } from "~/components/manage-list/manage-list-dialog";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import type {
  RestaurantTable,
  TableStatus,
} from "~/modules/table/domain/restaurant-table.entity";
import { TableFormDialog } from "./table-form-dialog";
import { TableRowActions } from "./table-row-actions";

const ALL_AREAS = "all";
const ALL_STATUS = "all";

const STATUS_LABEL: Record<TableStatus, string> = {
  available: "Trống",
  occupied: "Đang phục vụ",
};

export function TableList({
  page,
  pageSize,
  areaId,
  status,
}: {
  page: number;
  pageSize: number;
  areaId?: number;
  status?: TableStatus;
}) {
  const router = useRouter();
  const [areas] = api.table.listAreas.useSuspenseQuery();
  const { data, isFetching } = api.table.list.useQuery(
    { page, pageSize, areaId, status },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const [editingItem, setEditingItem] = useState<RestaurantTable | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const utils = api.useUtils();
  const [areaManagerOpen, setAreaManagerOpen] = useState(false);
  const { data: areasFull } = api.table.listAreasFull.useQuery(undefined, {
    enabled: areaManagerOpen,
  });
  const invalidateAreas = () => {
    void utils.table.listAreasFull.invalidate();
    void utils.table.listAreas.invalidate();
    void utils.table.list.invalidate();
  };
  const createAreaMutation = api.table.createArea.useMutation({
    onSuccess: invalidateAreas,
    onError: (error) =>
      toaster.create({ title: "Không thêm được khu vực", description: error.message, type: "error" }),
  });
  const updateAreaMutation = api.table.updateArea.useMutation({
    onSuccess: invalidateAreas,
    onError: (error) =>
      toaster.create({ title: "Không cập nhật được khu vực", description: error.message, type: "error" }),
  });
  const deleteAreaMutation = api.table.deleteArea.useMutation({
    onSuccess: invalidateAreas,
    onError: (error) =>
      toaster.create({ title: "Không xoá được khu vực", description: error.message, type: "error" }),
  });

  const columns: ListViewColumn<RestaurantTable>[] = [
    { key: "id", header: "ID", cell: (row) => row.id, width: "4rem" },
    { key: "name", header: "Tên bàn", cell: (row) => row.name },
    { key: "area", header: "Khu vực", cell: (row) => row.areaName },
    {
      key: "status",
      header: "Trạng thái",
      cell: (row) => (
        <StatusDot color={row.status === "available" ? "green.500" : "orange.500"}>
          {STATUS_LABEL[row.status]}
        </StatusDot>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "3rem",
      cell: (row) => (
        <TableRowActions
          item={row}
          onEdit={(item) => {
            setEditingItem(item);
            setDialogOpen(true);
          }}
        />
      ),
    },
  ];

  const buildHref = (params: {
    page?: number;
    pageSize?: number;
    areaId?: number;
    status?: TableStatus;
  }) => {
    const search = new URLSearchParams();
    // Dùng "in" thay vì "??" — phải phân biệt được "không truyền areaId/status"
    // (giữ filter hiện tại) với "truyền areaId/status: undefined" (xoá filter).
    const nextAreaId = "areaId" in params ? params.areaId : areaId;
    const nextStatus = "status" in params ? params.status : status;
    if (nextAreaId) search.set("areaId", String(nextAreaId));
    if (nextStatus) search.set("status", nextStatus);
    search.set("pageSize", String(params.pageSize ?? pageSize));
    search.set("page", String(params.page ?? page));
    return `/quan-ly/ban?${search.toString()}`;
  };

  return (
    <Stack gap={4}>
      <ListViewToolbar
        end={
          <>
            <Button variant="outline" onClick={() => setAreaManagerOpen(true)}>
              <Settings size={16} />
              Quản lý khu vực
            </Button>
            <Button
              onClick={() => {
                setEditingItem(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus size={16} />
              Thêm bàn
            </Button>
          </>
        }
      >
        <FilterSelect
          width="12rem"
          placeholder="Khu vực"
          value={areaId ? String(areaId) : ALL_AREAS}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                areaId: value === ALL_AREAS ? undefined : Number(value),
              }),
            )
          }
          options={[
            { value: ALL_AREAS, label: "Tất cả khu vực" },
            ...areas.map((a) => ({ value: String(a.id), label: a.name })),
          ]}
        />

        <FilterSelect
          width="12rem"
          placeholder="Trạng thái"
          value={status ?? ALL_STATUS}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                status: value === ALL_STATUS ? undefined : (value as TableStatus),
              }),
            )
          }
          options={[
            { value: ALL_STATUS, label: "Tất cả trạng thái" },
            { value: "available", label: "Trống" },
            { value: "occupied", label: "Đang phục vụ" },
          ]}
        />
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có bàn nào."
      />
      <ListViewPagination page={page} pageSize={pageSize} total={total} buildHref={buildHref} />

      <TableFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        areas={areas}
        item={editingItem}
      />

      <ManageListDialog
        open={areaManagerOpen}
        onOpenChange={setAreaManagerOpen}
        title="Quản lý khu vực"
        items={areasFull ?? []}
        isMutating={
          createAreaMutation.isPending || updateAreaMutation.isPending || deleteAreaMutation.isPending
        }
        onCreate={(name) => createAreaMutation.mutate({ name, isActive: true })}
        onUpdate={(id, patch) => {
          const current = areasFull?.find((a) => a.id === id);
          if (!current) return;
          updateAreaMutation.mutate({
            id,
            name: patch.name ?? current.name,
            isActive: patch.isActive ?? current.isActive,
          });
        }}
        onDelete={(id) => deleteAreaMutation.mutate({ id })}
      />
    </Stack>
  );
}
