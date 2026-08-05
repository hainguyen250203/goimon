"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData } from "@tanstack/react-query";
import { Button, Stack } from "@chakra-ui/react";
import { Plus } from "lucide-react";

import {
  ListViewTable,
  type ListViewColumn,
} from "~/components/data-table/list-view-table";
import { ListViewPagination } from "~/components/data-table/list-view-pagination";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { FilterSelect } from "~/components/data-table/filter-select";
import { StatusDot } from "~/components/ui/status-dot";
import { api } from "~/trpc/react";
import type { Promotion } from "~/modules/promotion/domain/promotion.entity";
import { PromotionFormDialog } from "./promotion-form-dialog";
import { PromotionRowActions } from "./promotion-row-actions";

const ALL_STATUS = "all";

function statusToParam(isActive?: boolean) {
  if (isActive === true) return "active";
  if (isActive === false) return "inactive";
  return ALL_STATUS;
}

function formatDiscount(item: Promotion) {
  return item.discountType === "percent"
    ? `${item.discountValue}%`
    : `${new Intl.NumberFormat("vi-VN").format(item.discountValue)}đ`;
}

export function PromotionList({
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
  const { data, isFetching } = api.promotion.list.useQuery(
    { page, pageSize, isActive },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter. Đã prefetch
    // + hydrate ở Server Component nên lần render đầu luôn có sẵn data.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const [editingItem, setEditingItem] = useState<Promotion | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ListViewColumn<Promotion>[] = [
    { key: "id", header: "ID", cell: (row) => row.id, width: "4rem" },
    { key: "name", header: "Tên khuyến mãi", cell: (row) => row.name },
    {
      key: "discountType",
      header: "Loại giảm giá",
      cell: (row) => (row.discountType === "percent" ? "Phần trăm" : "Số tiền cố định"),
    },
    { key: "discountValue", header: "Giá trị giảm", cell: (row) => formatDiscount(row) },
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
            cell: (row: Promotion) => (
              <PromotionRowActions
                item={row}
                onEdit={(item) => {
                  setEditingItem(item);
                  setDialogOpen(true);
                }}
              />
            ),
          } satisfies ListViewColumn<Promotion>,
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
    return `/quan-ly/khuyen-mai?${search.toString()}`;
  };

  return (
    <Stack gap={4}>
      <ListViewToolbar
        end={
          canManage && (
            <Button
              onClick={() => {
                setEditingItem(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus size={16} />
              Thêm khuyến mãi
            </Button>
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
        emptyMessage="Chưa có khuyến mãi nào."
      />
      <ListViewPagination page={page} pageSize={pageSize} total={total} buildHref={buildHref} />

      <PromotionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
      />
    </Stack>
  );
}
