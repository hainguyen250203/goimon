"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData } from "@tanstack/react-query";
import { Button, Stack } from "@chakra-ui/react";
import { Plus, Settings } from "lucide-react";

import {
  ListViewTable,
  type ListViewColumn,
} from "~/components/data-table/list-view-table";
import { ListViewPagination } from "~/components/data-table/list-view-pagination";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { FilterSelect } from "~/components/data-table/filter-select";
import { ManageListDialog } from "~/components/manage-list/manage-list-dialog";
import { StatusDot } from "~/components/ui/status-dot";
import { toaster } from "~/components/ui/toaster";
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

  const utils = api.useUtils();
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const { data: categoriesFull } = api.menu.listCategoriesFull.useQuery(undefined, {
    enabled: categoryManagerOpen,
  });
  const invalidateCategories = () => {
    void utils.menu.listCategoriesFull.invalidate();
    void utils.menu.listCategories.invalidate();
    void utils.menu.list.invalidate();
  };
  const createCategoryMutation = api.menu.createCategory.useMutation({
    onSuccess: invalidateCategories,
    onError: (error) =>
      toaster.create({ title: "Không thêm được danh mục", description: error.message, type: "error" }),
  });
  const updateCategoryMutation = api.menu.updateCategory.useMutation({
    onSuccess: invalidateCategories,
    onError: (error) =>
      toaster.create({ title: "Không cập nhật được danh mục", description: error.message, type: "error" }),
  });
  const deleteCategoryMutation = api.menu.deleteCategory.useMutation({
    onSuccess: invalidateCategories,
    onError: (error) =>
      toaster.create({ title: "Không xoá được danh mục", description: error.message, type: "error" }),
  });

  const columns: ListViewColumn<MenuItem>[] = [
    { key: "id", header: "ID", cell: (row) => row.id, width: "4rem" },
    { key: "name", header: "Tên món", cell: (row) => row.name },
    { key: "category", header: "Danh mục", cell: (row) => row.categoryName },
    {
      key: "price",
      header: "Giá",
      cell: (row) => formatVnd(row.price),
      textAlign: "right",
    },
    {
      key: "isAvailable",
      header: "Tồn kho",
      cell: (row) => (
        <StatusDot color={row.isAvailable ? "green.500" : "gray.400"}>
          {row.isAvailable ? "Còn hàng" : "Hết hàng"}
        </StatusDot>
      ),
    },
    {
      key: "isPublished",
      header: "Hiển thị",
      cell: (row) => (
        <StatusDot color={row.isPublished ? "green.500" : "gray.400"}>
          {row.isPublished ? "Đang bán" : "Đã ẩn"}
        </StatusDot>
      ),
    },
    {
      key: "printToKitchen",
      header: "In bếp",
      cell: (row) => (
        <StatusDot color={row.printToKitchen ? "green.500" : "gray.400"}>
          {row.printToKitchen ? "Có" : "Không"}
        </StatusDot>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "3rem",
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
    <Stack gap={4}>
      <ListViewToolbar
        end={
          <>
            <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
              <Settings size={16} />
              Quản lý danh mục
            </Button>
            <Button
              onClick={() => {
                setEditingItem(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus size={16} />
              Thêm món ăn
            </Button>
          </>
        }
      >
        <FilterSelect
          width="14rem"
          placeholder="Danh mục"
          value={categoryId ? String(categoryId) : ALL_CATEGORIES}
          onValueChange={(value) =>
            router.push(
              buildHref({
                page: 1,
                categoryId: value === ALL_CATEGORIES ? undefined : Number(value),
              }),
            )
          }
          options={[
            { value: ALL_CATEGORIES, label: "Tất cả danh mục" },
            ...categories.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />
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

      <ManageListDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        title="Quản lý danh mục"
        items={categoriesFull ?? []}
        isMutating={
          createCategoryMutation.isPending ||
          updateCategoryMutation.isPending ||
          deleteCategoryMutation.isPending
        }
        onCreate={(name) => createCategoryMutation.mutate({ name, isActive: true })}
        onUpdate={(id, patch) => {
          const current = categoriesFull?.find((c) => c.id === id);
          if (!current) return;
          updateCategoryMutation.mutate({
            id,
            name: patch.name ?? current.name,
            isActive: patch.isActive ?? current.isActive,
          });
        }}
        onDelete={(id) => deleteCategoryMutation.mutate({ id })}
      />
    </Stack>
  );
}
