"use client";

import { useRouter } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";

import { Badge } from "~/components/ui/badge";
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

const STATUS_BADGE_VARIANT: Record<
  OrderStatus,
  "outline" | "secondary" | "default" | "destructive"
> = {
  open: "outline",
  printed: "secondary",
  paid: "default",
  cancelled: "destructive",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};

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
    cell: (row) => row.id,
    className: "w-16 text-muted-foreground",
  },
  {
    key: "table",
    header: "Bàn",
    cell: (row) => (
      <div className="flex flex-col">
        <span>{row.tableName}</span>
        <span className="text-xs text-muted-foreground">{row.areaName}</span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Trạng thái",
    cell: (row) => (
      <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
        {STATUS_LABEL[row.status]}
      </Badge>
    ),
  },
  {
    key: "totalAmount",
    header: "Tổng tiền",
    cell: (row) => (row.totalAmount != null ? formatVnd(row.totalAmount) : "—"),
    className: "text-right",
  },
  {
    key: "paymentMethod",
    header: "Thanh toán",
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
    <div className="flex flex-1 flex-col gap-4">
      <ListViewToolbar>
        <Select
          value={status ?? ALL_STATUS}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                status: value === ALL_STATUS ? undefined : (value as OrderStatus),
              }),
            )
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Trạng thái">
              {(value: string) =>
                !value || value === ALL_STATUS
                  ? "Tất cả trạng thái"
                  : (STATUS_LABEL[value as OrderStatus] ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_STATUS}>Tất cả trạng thái</SelectItem>
              <SelectItem value="open">Đang mở</SelectItem>
              <SelectItem value="printed">Đã in bill</SelectItem>
              <SelectItem value="paid">Đã thanh toán</SelectItem>
              <SelectItem value="cancelled">Đã huỷ</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
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
    </div>
  );
}
