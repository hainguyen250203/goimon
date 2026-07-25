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
import type {
  RestaurantTable,
  TableStatus,
} from "~/modules/table/domain/restaurant-table.entity";
import { TableFormDialog } from "./table-form-dialog";
import { TableRowActions } from "./table-row-actions";

const PAGE_SIZE = 20;
const ALL_AREAS = "all";
const ALL_STATUS = "all";

const STATUS_LABEL: Record<TableStatus, string> = {
  available: "Trống",
  occupied: "Đang phục vụ",
};

export function TableList({
  page,
  areaId,
  status,
}: {
  page: number;
  areaId?: number;
  status?: TableStatus;
}) {
  const router = useRouter();
  const [areas] = api.table.listAreas.useSuspenseQuery();
  const { data, isFetching } = api.table.list.useQuery(
    { page, pageSize: PAGE_SIZE, areaId, status },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const [editingItem, setEditingItem] = useState<RestaurantTable | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ListViewColumn<RestaurantTable>[] = [
    {
      key: "id",
      header: "ID",
      cell: (row) => row.id,
      className: "w-16 text-muted-foreground",
    },
    { key: "name", header: "Tên bàn", cell: (row) => row.name },
    { key: "area", header: "Khu vực", cell: (row) => row.areaName },
    {
      key: "status",
      header: "Trạng thái",
      cell: (row) => (
        <Badge variant={row.status === "available" ? "secondary" : "default"}>
          {STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
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
    areaId?: number;
    status?: TableStatus;
  }) => {
    const search = new URLSearchParams();
    const nextAreaId = "areaId" in params ? params.areaId : areaId;
    const nextStatus = "status" in params ? params.status : status;
    if (nextAreaId) search.set("areaId", String(nextAreaId));
    if (nextStatus) search.set("status", nextStatus);
    search.set("page", String(params.page ?? page));
    return `/quan-ly/ban?${search.toString()}`;
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
            Thêm bàn
          </Button>
        }
      >
        <Select
          value={areaId ? String(areaId) : ALL_AREAS}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                areaId: value === ALL_AREAS ? undefined : Number(value),
              }),
            )
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Khu vực">
              {(value: string) =>
                !value || value === ALL_AREAS
                  ? "Tất cả khu vực"
                  : (areas.find((a) => String(a.id) === value)?.name ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_AREAS}>Tất cả khu vực</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={status ?? ALL_STATUS}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                status: value === ALL_STATUS ? undefined : (value as TableStatus),
              }),
            )
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Trạng thái">
              {(value: string) =>
                !value || value === ALL_STATUS
                  ? "Tất cả trạng thái"
                  : (STATUS_LABEL[value as TableStatus] ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_STATUS}>Tất cả trạng thái</SelectItem>
              <SelectItem value="available">Trống</SelectItem>
              <SelectItem value="occupied">Đang phục vụ</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có bàn nào."
      />
      <ListViewPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => buildHref({ page: p })}
      />

      <TableFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        areas={areas}
        item={editingItem}
      />
    </div>
  );
}
