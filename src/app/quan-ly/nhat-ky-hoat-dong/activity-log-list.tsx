"use client";

import { useMemo } from "react";
import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData } from "@tanstack/react-query";
import { Stack, Text } from "@chakra-ui/react";

import { ListViewTable, type ListViewColumn } from "~/components/data-table/list-view-table";
import { ListViewPagination } from "~/components/data-table/list-view-pagination";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { FilterDrawer } from "~/components/data-table/filter-drawer";
import type { FilterField } from "~/components/data-table/filter-field.type";
import { api } from "~/trpc/react";
import { formatDateTime } from "~/lib/format-order";
import { MAX_PAGE_SIZE } from "~/lib/pagination";
import { endOfVNDayExclusive, parseVNDateInputValue } from "~/lib/vn-date-range";
import type { ActivityLogEntry } from "~/modules/activity-log/domain/activity-log.repository";

// Nhãn tiếng Việt cho entityType/action đang thực sự được ghi (xem các
// *.router.ts gọi logActivity()) — entityType/action lạ (nếu phát sinh sau
// này) vẫn hiển thị được nguyên bản, không throw.
const ENTITY_TYPE_LABEL: Record<string, string> = {
  table: "Bàn",
  area: "Khu vực",
  printer: "Máy in",
  menu_item: "Món ăn",
  category: "Danh mục",
  user: "Người dùng",
  shift: "Ca làm việc",
  promotion: "Khuyến mãi",
  "payment-config": "Thanh toán",
  order: "Đơn hàng",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xoá",
  ban: "Khoá tài khoản",
  unban: "Mở khoá tài khoản",
  set_password: "Đặt lại mật khẩu",
  set_role: "Đổi vai trò",
  close: "Đóng ca",
};

const ENTITY_TYPE_OPTIONS = Object.entries(ENTITY_TYPE_LABEL).map(([value, label]) => ({ value, label }));

function formatValue(value: unknown) {
  return value === null || value === undefined ? "—" : String(value);
}

function formatFlat(fields: Record<string, unknown>) {
  const entries = Object.entries(fields);
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => `${key}: ${formatValue(value)}`).join(" · ");
}

/**
 * Hành động "cập nhật" (update/set_role/ban/unban/đóng ca) ghi metadata dạng
 * chuẩn { before, after } — diff ra field nào THỰC SỰ đổi, hiển thị
 * "field: cũ -> mới". Metadata cũ dạng phẳng (create/delete, hoặc log ghi
 * trước khi có chuẩn này) không có 2 key before/after nên rớt về hiển thị
 * phẳng như cũ — không vỡ log lịch sử.
 */
function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return "—";

  const hasEnvelope = "before" in metadata || "after" in metadata;
  if (!hasEnvelope) return formatFlat(metadata);

  const before = metadata.before as Record<string, unknown> | null | undefined;
  const after = metadata.after as Record<string, unknown> | null | undefined;

  if (before && after) {
    const changed = Object.keys(after).filter((key) => before[key] !== after[key]);
    if (changed.length === 0) return "Không có gì thay đổi";
    return changed
      .map((key) => `${key}: ${formatValue(before[key])} -> ${formatValue(after[key])}`)
      .join(" · ");
  }
  // before null (vd payment-config lần đầu thiết lập) hoặc after null — hiện phẳng bên còn lại.
  return formatFlat((after ?? before ?? {}) as Record<string, unknown>);
}

const columns: ListViewColumn<ActivityLogEntry>[] = [
  { key: "id", header: "ID", cell: (row) => row.id, width: "4rem" },
  { key: "actorName", header: "Người thực hiện", cell: (row) => row.actorName },
  { key: "action", header: "Hành động", cell: (row) => ACTION_LABEL[row.action] ?? row.action },
  {
    key: "entityType",
    header: "Đối tượng",
    cell: (row) => ENTITY_TYPE_LABEL[row.entityType] ?? row.entityType,
  },
  { key: "entityId", header: "ID đối tượng", cell: (row) => row.entityId, width: "6rem" },
  {
    key: "metadata",
    header: "Chi tiết",
    cell: (row) => (
      <Text fontSize="xs" color="fg.muted" lineClamp={1}>
        {formatMetadata(row.metadata)}
      </Text>
    ),
  },
  { key: "createdAt", header: "Thời gian", cell: (row) => formatDateTime(row.createdAt) },
];

/** Nhật ký hoạt động toàn hệ thống (create/update/delete menu, bàn, máy in, user...) — khác order_events (vòng đời riêng của từng đơn, xem order-timeline.tsx). */
export function ActivityLogList({
  page,
  pageSize,
  entityType,
  actorId,
  dateFrom,
  dateTo,
  defaultDateFrom,
  defaultDateTo,
}: {
  page: number;
  pageSize: number;
  entityType?: string;
  actorId?: string;
  /** Chuỗi "YYYY-MM-DD" — 2 field độc lập, không bắt buộc đi cùng cặp. */
  dateFrom?: string;
  dateTo?: string;
  /** Giá trị mặc định "trong tháng" (tính sẵn ở page.tsx) — field trùng
   * default không tính là filter đang áp dụng, xem FilterDrawer. */
  defaultDateFrom: string;
  defaultDateTo: string;
}) {
  const router = useRouter();
  const { data, isFetching } = api.activityLog.list.useQuery(
    {
      page,
      pageSize,
      entityType,
      actorId,
      dateFrom: dateFrom ? parseVNDateInputValue(dateFrom) : undefined,
      dateTo: dateTo ? endOfVNDayExclusive(dateTo) : undefined,
    },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const buildHref = (params: {
    page?: number;
    pageSize?: number;
    entityType?: string;
    actorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const search = new URLSearchParams();
    const nextEntityType = "entityType" in params ? params.entityType : entityType;
    const nextActorId = "actorId" in params ? params.actorId : actorId;
    const nextDateFrom = "dateFrom" in params ? params.dateFrom : dateFrom;
    const nextDateTo = "dateTo" in params ? params.dateTo : dateTo;
    if (nextEntityType) search.set("entityType", nextEntityType);
    if (nextActorId) search.set("actorId", nextActorId);
    if (nextDateFrom) search.set("dateFrom", nextDateFrom);
    if (nextDateTo) search.set("dateTo", nextDateTo);
    search.set("pageSize", String(params.pageSize ?? pageSize));
    search.set("page", String(params.page ?? page));
    return `/quan-ly/nhat-ky-hoat-dong?${search.toString()}`;
  };

  // Danh sách người dùng cho field "actorId" (variant combobox) — tải 1 lần,
  // FilterCombobox tự lọc client-side (số lượng nhỏ trong 1 quán).
  const { data: usersData } = api.user.list.useQuery({ pageSize: MAX_PAGE_SIZE });
  const userOptions = useMemo(
    () =>
      (usersData?.items ?? []).map((u) => ({
        value: u.id,
        label: u.phoneNumber ? `${u.name} · ${u.phoneNumber}` : u.name,
      })),
    [usersData],
  );

  const fields: FilterField[] = [
    { name: "date", label: "Khoảng ngày", type: "daterange", size: 2 },
    {
      name: "entityType",
      label: "Loại đối tượng",
      type: "select",
      options: ENTITY_TYPE_OPTIONS,
      allLabel: "Tất cả loại",
      size: 2,
    },
    {
      name: "actorId",
      label: "Người dùng",
      type: "select",
      variant: "combobox",
      options: userOptions,
      placeholder: "Lọc theo người dùng...",
      size: 2,
    },
  ];
  const filterValues = {
    entityType: entityType ?? "",
    actorId: actorId ?? "",
    dateFrom: dateFrom ?? "",
    dateTo: dateTo ?? "",
  };
  const filterDefaults = { dateFrom: defaultDateFrom, dateTo: defaultDateTo };

  return (
    <Stack gap={4}>
      <ListViewToolbar
        end={
          <FilterDrawer
            triggerLabel="Bộ lọc"
            fields={fields}
            values={filterValues}
            defaults={filterDefaults}
            onApply={(patch) =>
              router.push(
                buildHref({
                  page: 1,
                  entityType: patch.entityType,
                  actorId: patch.actorId,
                  dateFrom: patch.dateFrom,
                  dateTo: patch.dateTo,
                }),
              )
            }
          />
        }
      >
        {null}
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có hoạt động nào."
      />
      <ListViewPagination page={page} pageSize={pageSize} total={total} buildHref={buildHref} />
    </Stack>
  );
}
