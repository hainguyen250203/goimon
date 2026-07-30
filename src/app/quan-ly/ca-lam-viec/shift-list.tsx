"use client";

import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData } from "@tanstack/react-query";
import { Stack, Text } from "@chakra-ui/react";
import { StatusDot } from "~/components/ui/status-dot";

import {
  ListViewTable,
  type ListViewColumn,
} from "~/components/data-table/list-view-table";
import { ListViewPagination } from "~/components/data-table/list-view-pagination";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { FilterSelect } from "~/components/data-table/filter-select";
import { api } from "~/trpc/react";
import { formatVnd } from "~/lib/format-order";
import type { ShiftListItemWithRevenue } from "~/modules/shift/application/list-shifts.usecase";
import type { ShiftStatus } from "~/modules/shift/domain/shift.entity";

const PAGE_SIZE = 20;
const ALL_STATUS = "all";

const STATUS_LABEL: Record<ShiftStatus, string> = {
  open: "Đang mở",
  closed: "Đã đóng",
};

const STATUS_DOT_COLOR: Record<ShiftStatus, string> = {
  open: "green.500",
  closed: "gray.400",
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const columns: ListViewColumn<ShiftListItemWithRevenue>[] = [
  {
    key: "id",
    header: "ID",
    cell: (row) => <Text color="fg.muted">{row.id}</Text>,
    width: "4rem",
  },
  {
    key: "status",
    header: "Trạng thái",
    cell: (row) => (
      <StatusDot color={STATUS_DOT_COLOR[row.status]}>{STATUS_LABEL[row.status]}</StatusDot>
    ),
  },
  { key: "openedByName", header: "Người mở", cell: (row) => row.openedByName },
  { key: "closedByName", header: "Người đóng", cell: (row) => row.closedByName ?? "—" },
  { key: "startTime", header: "Mở lúc", cell: (row) => formatDateTime(row.startTime) },
  {
    key: "endTime",
    header: "Đóng lúc",
    cell: (row) => (row.endTime ? formatDateTime(row.endTime) : "—"),
  },
  {
    key: "totalRevenue",
    header: "Doanh thu",
    cell: (row) => formatVnd(row.totalRevenue),
    textAlign: "right",
  },
  {
    key: "paidOrderCount",
    header: "Số đơn",
    cell: (row) => String(row.paidOrderCount),
    textAlign: "right",
  },
];

export function ShiftList({ page, status }: { page: number; status?: ShiftStatus }) {
  const router = useRouter();
  const { data, isFetching } = api.shift.list.useQuery(
    { page, pageSize: PAGE_SIZE, status },
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const buildHref = (params: { page?: number; status?: ShiftStatus }) => {
    const search = new URLSearchParams();
    const nextStatus = "status" in params ? params.status : status;
    if (nextStatus) search.set("status", nextStatus);
    search.set("page", String(params.page ?? page));
    return `/quan-ly/ca-lam-viec?${search.toString()}`;
  };

  return (
    <Stack gap={4}>
      <ListViewToolbar>
        <FilterSelect
          width="14rem"
          placeholder="Trạng thái"
          value={status ?? ALL_STATUS}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                status: value === ALL_STATUS ? undefined : (value as ShiftStatus),
              }),
            )
          }
          options={[
            { value: ALL_STATUS, label: "Tất cả trạng thái" },
            { value: "open", label: STATUS_LABEL.open },
            { value: "closed", label: STATUS_LABEL.closed },
          ]}
        />
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có ca làm việc nào."
      />
      <ListViewPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => buildHref({ page: p })}
      />
    </Stack>
  );
}
