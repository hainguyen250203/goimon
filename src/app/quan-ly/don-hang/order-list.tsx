"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData } from "@tanstack/react-query";
import { Stack, Text } from "@chakra-ui/react";
import { StatusDot } from "~/components/ui/status-dot";
import { NumericInput } from "~/components/ui/numeric-input";

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

const ALL_STATUS = "all";
const DELETED_STATUS = "deleted";

const STATUS_OPTIONS = [
  { value: ALL_STATUS, label: "Tất cả trạng thái" },
  { value: "open", label: STATUS_LABEL.open },
  { value: "paid", label: STATUS_LABEL.paid },
  { value: "cancelled", label: STATUS_LABEL.cancelled },
  { value: "transferred", label: STATUS_LABEL.transferred },
];

function buildColumns(canDelete: boolean): ListViewColumn<OrderListItem>[] {
  return [
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
    cell: (row) =>
      row.totalAmount != null
        ? formatVnd(row.totalAmount)
        : formatVnd(row.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)),
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
    cell: (row) => <OrderRowActions row={row} canDelete={canDelete} />,
  },
];
}

export function OrderList({
  page,
  pageSize,
  status,
  shiftId,
  deleted,
  canViewDeleted,
  canDelete,
}: {
  page: number;
  pageSize: number;
  status?: OrderStatus;
  shiftId?: number;
  /** true = đang xem filter "Đã xoá" (page.tsx đã tự kiểm tra canViewDeleted
   * trước khi cho true, non-superadmin gõ tay ?status=deleted vẫn an toàn). */
  deleted: boolean;
  /** Chỉ superadmin thấy option filter "Đã xoá". */
  canViewDeleted: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { data, isFetching } = api.order.list.useQuery(
    { page, pageSize, status, shiftId, deleted },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const columns = buildColumns(canDelete);

  // "statusParam" là giá trị THÔ ghi vào URL — có thể là 1 OrderStatus thật
  // hoặc sentinel "deleted" (page.tsx tự phân biệt lại 2 trường hợp này).
  const currentStatusParam = deleted ? DELETED_STATUS : status;
  const buildHref = (params: {
    page?: number;
    pageSize?: number;
    statusParam?: string;
    shiftId?: number;
  }) => {
    const search = new URLSearchParams();
    const nextStatus = "statusParam" in params ? params.statusParam : currentStatusParam;
    const nextShiftId = "shiftId" in params ? params.shiftId : shiftId;
    if (nextStatus) search.set("status", nextStatus);
    if (nextShiftId) search.set("shiftId", String(nextShiftId));
    search.set("pageSize", String(params.pageSize ?? pageSize));
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
          value={currentStatusParam ?? ALL_STATUS}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                statusParam: value === ALL_STATUS ? undefined : value,
              }),
            )
          }
          options={
            canViewDeleted
              ? [...STATUS_OPTIONS, { value: DELETED_STATUS, label: "Đã xoá" }]
              : STATUS_OPTIONS
          }
        />
        <NumericInput
          width="10rem"
          placeholder="Số Ca"
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
      <ListViewPagination page={page} pageSize={pageSize} total={total} buildHref={buildHref} />
    </Stack>
  );
}
