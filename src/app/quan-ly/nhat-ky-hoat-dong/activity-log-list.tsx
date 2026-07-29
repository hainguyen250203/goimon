"use client";

import { useRouter } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { Stack, Text } from "@chakra-ui/react";

import { ListViewTable, type ListViewColumn } from "~/components/data-table/list-view-table";
import { ListViewPagination } from "~/components/data-table/list-view-pagination";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { FilterSelect } from "~/components/data-table/filter-select";
import { api } from "~/trpc/react";
import { formatDateTime } from "~/lib/format-order";
import type { ActivityLogEntry } from "~/modules/activity-log/domain/activity-log.repository";

const PAGE_SIZE = 20;
const ALL_ENTITY_TYPE = "all";

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

const ENTITY_TYPE_OPTIONS = [
  { value: ALL_ENTITY_TYPE, label: "Tất cả loại" },
  ...Object.entries(ENTITY_TYPE_LABEL).map(([value, label]) => ({ value, label })),
];

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return "—";
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
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
export function ActivityLogList({ page, entityType }: { page: number; entityType?: string }) {
  const router = useRouter();
  const { data, isFetching } = api.activityLog.list.useQuery(
    { page, pageSize: PAGE_SIZE, entityType },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const buildHref = (params: { page?: number; entityType?: string }) => {
    const search = new URLSearchParams();
    const nextEntityType = "entityType" in params ? params.entityType : entityType;
    if (nextEntityType) search.set("entityType", nextEntityType);
    search.set("page", String(params.page ?? page));
    return `/quan-ly/nhat-ky-hoat-dong?${search.toString()}`;
  };

  return (
    <Stack gap={4}>
      <ListViewToolbar>
        <FilterSelect
          width="14rem"
          placeholder="Loại đối tượng"
          value={entityType ?? ALL_ENTITY_TYPE}
          onValueChange={(value) =>
            router.push(buildHref({ page: 1, entityType: value === ALL_ENTITY_TYPE ? undefined : value }))
          }
          options={ENTITY_TYPE_OPTIONS}
        />
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có hoạt động nào."
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
