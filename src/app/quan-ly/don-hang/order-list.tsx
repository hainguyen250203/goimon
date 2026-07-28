"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { Input, Stack, Text } from "@chakra-ui/react";
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
import {
  formatDateTime,
  formatVnd,
  PAYMENT_METHOD_LABEL,
  STATUS_DOT_COLOR,
  STATUS_LABEL,
} from "~/lib/format-order";
import { OrderRowActions } from "./order-row-actions";

const PAGE_SIZE = 20;
const ALL_STATUS = "all";

const STATUS_OPTIONS = [
  { value: ALL_STATUS, label: "Tất cả trạng thái" },
  { value: "open", label: STATUS_LABEL.open },
  { value: "printed", label: STATUS_LABEL.printed },
  { value: "paid", label: STATUS_LABEL.paid },
  { value: "cancelled", label: STATUS_LABEL.cancelled },
];

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
    key: "shift",
    header: "Ca",
    cell: (row) => (row.shiftId ? `Ca #${row.shiftId}` : "—"),
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
  {
    key: "actions",
    header: "",
    width: "3rem",
    cell: (row) => <OrderRowActions row={row} />,
  },
];

export function OrderList({
  page,
  status,
  shiftId,
}: {
  page: number;
  status?: OrderStatus;
  shiftId?: number;
}) {
  const router = useRouter();
  const { data, isFetching } = api.order.list.useQuery(
    { page, pageSize: PAGE_SIZE, status, shiftId },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const buildHref = (params: { page?: number; status?: OrderStatus; shiftId?: number }) => {
    const search = new URLSearchParams();
    const nextStatus = "status" in params ? params.status : status;
    const nextShiftId = "shiftId" in params ? params.shiftId : shiftId;
    if (nextStatus) search.set("status", nextStatus);
    if (nextShiftId) search.set("shiftId", String(nextShiftId));
    search.set("page", String(params.page ?? page));
    return `/quan-ly/don-hang?${search.toString()}`;
  };

  // Input số Ca — gõ xong đợi rồi mới điều hướng (tránh push URL mỗi ký tự).
  const [shiftIdInput, setShiftIdInput] = useState(shiftId ? String(shiftId) : "");

  useEffect(() => {
    setShiftIdInput(shiftId ? String(shiftId) : "");
  }, [shiftId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = shiftIdInput.trim();
      const parsed = trimmed ? Number(trimmed) : undefined;
      const nextShiftId = parsed && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
      if (nextShiftId !== shiftId) {
        router.push(buildHref({ page: 1, shiftId: nextShiftId }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [shiftIdInput]);

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
        <Input
          width="10rem"
          placeholder="Số Ca"
          type="number"
          min={1}
          value={shiftIdInput}
          onChange={(e) => setShiftIdInput(e.target.value)}
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
