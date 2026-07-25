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
import type { MenuItem } from "~/modules/menu/domain/menu-item.entity";
import { MenuItemFormDialog } from "./menu-item-form-dialog";
import { MenuItemRowActions } from "./menu-item-row-actions";

const PAGE_SIZE = 20;
const ALL_CATEGORIES = "all";

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export function MenuItemList({
  page,
  categoryId,
}: {
  page: number;
  categoryId?: number;
}) {
  const router = useRouter();
  const [categories] = api.menu.listCategories.useSuspenseQuery();
  const { data, isFetching } = api.menu.list.useQuery(
    { page, pageSize: PAGE_SIZE, categoryId },
    // Giữ data trang cũ hiển thị trong lúc fetch trang mới — tránh nháy
    // skeleton/trắng màn hình khi đổi trang hoặc đổi filter. Đã prefetch
    // + hydrate ở Server Component nên lần render đầu luôn có sẵn data.
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const [editingItem, setEditingItem] = useState<MenuItem | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ListViewColumn<MenuItem>[] = [
    {
      key: "id",
      header: "ID",
      cell: (row) => row.id,
      className: "w-16 text-muted-foreground",
    },
    { key: "name", header: "Tên món", cell: (row) => row.name },
    { key: "category", header: "Danh mục", cell: (row) => row.categoryName },
    {
      key: "price",
      header: "Giá",
      cell: (row) => formatVnd(row.price),
      className: "text-right",
    },
    {
      key: "isAvailable",
      header: "Tồn kho",
      cell: (row) => (
        <Badge variant={row.isAvailable ? "secondary" : "outline"}>
          {row.isAvailable ? "Còn hàng" : "Hết hàng"}
        </Badge>
      ),
    },
    {
      key: "isPublished",
      header: "Hiển thị",
      cell: (row) => (
        <Badge variant={row.isPublished ? "secondary" : "outline"}>
          {row.isPublished ? "Đang bán" : "Đã ẩn"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      cell: (row) => (
        <MenuItemRowActions
          item={row}
          onEdit={(item) => {
            setEditingItem(item);
            setDialogOpen(true);
          }}
        />
      ),
    },
  ];

  const buildHref = (params: { page?: number; categoryId?: number }) => {
    const search = new URLSearchParams();
    // Dùng "in" thay vì "??" — phải phân biệt được "không truyền categoryId"
    // (giữ filter hiện tại) với "truyền categoryId: undefined" (xoá filter).
    const nextCategoryId = "categoryId" in params ? params.categoryId : categoryId;
    if (nextCategoryId) search.set("categoryId", String(nextCategoryId));
    search.set("page", String(params.page ?? page));
    return `/quan-ly/mon-an?${search.toString()}`;
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
            Thêm món ăn
          </Button>
        }
      >
        <Select
          value={categoryId ? String(categoryId) : ALL_CATEGORIES}
          onValueChange={(value) => {
            router.push(
              buildHref({
                page: 1,
                categoryId: value === ALL_CATEGORIES ? undefined : Number(value),
              }),
            );
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Danh mục">
              {(value: string) =>
                !value || value === ALL_CATEGORIES
                  ? "Tất cả danh mục"
                  : (categories.find((c) => String(c.id) === value)?.name ??
                    value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_CATEGORIES}>Tất cả danh mục</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có món ăn nào."
      />
      <ListViewPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => buildHref({ page: p })}
      />

      <MenuItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        item={editingItem}
      />
    </div>
  );
}
