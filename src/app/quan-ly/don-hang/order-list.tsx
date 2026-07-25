"use client";

import { useRouter } from "next/navigation";
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
import type {
  OrderListItem,
  OrderStatus,
} from "~/modules/order/domain/order-list-item.entity";

const PAGE_SIZE = 20;
const ALL_STATUS = "all";

const STATUS_LABEL: Record<OrderStatus, string> = {
  open: "Đang mở",
  printed: "Đã in bill",
  paid: "Đã thanh toán",
  cancelled: "Đã huỷ",
};

const STATUS_DOT_COLOR: Record<OrderStatus, string> = {
  open: "gray.400",
  printed: "blue.500",
  paid: "green.500",
  cancelled: "red.500",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};

const STATUS_OPTIONS = [
  { value: ALL_STATUS, label: "Tất cả trạng thái" },
  { value: "open", label: STATUS_LABEL.open },
  { value: "printed", label: STATUS_LABEL.printed },
  { value: "paid", label: STATUS_LABEL.paid },
  { value: "cancelled", label: STATUS_LABEL.cancelled },
];

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const columns: ListViewColumn<OrderListItem>[] = [
  {
    key: "id",
    header: "ID",
    cell: (row) => (
      <Text color="fg.muted">{row.id}</Text>
    ),
    width: "4rem",
  },
  {
    key: "table",
    header: "Bàn",
    cell: (row) => (
      <Stack gap={0}>
        <Text>{row.tableName}</Text>
        <Text fontSize="xs" color="fg.muted">
          {row.areaName}
        </Text>
      </Stack>
    ),
  },
  {
    key: "status",
    header: "Trạng thái",
    cell: (row) => (
      <StatusDot color={STATUS_DOT_COLOR[row.status]}>
        {STATUS_LABEL[row.status]}
      </StatusDot>
    ),
  },
  {
    key: "totalAmount",
    header: "Tổng tiền",
    cell: (row) => (row.totalAmount != null ? formatVnd(row.totalAmount) : "—"),
    textAlign: "right",
  },
  {
    key: "promotionName",
    header: "Khuyến mãi",
    cell: (row) => row.promotionName ?? "—",
  },
  {
    key: "paymentMethod",
    header: "Phương thức TT",
    cell: (row) =>
      row.paymentMethod ? PAYMENT_METHOD_LABEL[row.paymentMethod] : "—",
  },
  { key: "createdByName", header: "Người tạo", cell: (row) => row.createdByName },
  {
    key: "createdAt",
    header: "Tạo lúc",
    cell: (row) => formatDateTime(row.createdAt),
  },
  {
    key: "paidConfirmedAt",
    header: "Thanh toán lúc",
    cell: (row) =>
      row.paidConfirmedAt ? formatDateTime(row.paidConfirmedAt) : "—",
  },
];

export function OrderList({
  page,
  status,
}: {
  page: number;
  status?: OrderStatus;
}) {
  const router = useRouter();
  const { data, isFetching } = api.order.list.useQuery(
    { page, pageSize: PAGE_SIZE, status },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const buildHref = (params: { page?: number; status?: OrderStatus }) => {
    const search = new URLSearchParams();
    const nextStatus = "status" in params ? params.status : status;
    if (nextStatus) search.set("status", nextStatus);
    search.set("page", String(params.page ?? page));
    return `/quan-ly/don-hang?${search.toString()}`;
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
                status: value === ALL_STATUS ? undefined : (value as OrderStatus),
              }),
            )
          }
          options={STATUS_OPTIONS}
        />
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có đơn hàng nào."
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
