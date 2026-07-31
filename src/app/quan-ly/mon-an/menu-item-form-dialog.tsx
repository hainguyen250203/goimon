"use client";

import { useEffect, useState } from "react";
import { Button, Input, Stack } from "@chakra-ui/react";

import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field } from "~/components/ui/field";
import { Switch } from "~/components/ui/switch";
import { FilterSelect } from "~/components/data-table/filter-select";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import type { MenuItem } from "~/modules/menu/domain/menu-item.entity";
import type { CategoryOption } from "~/modules/menu/domain/menu-item.repository";

type FormState = {
  name: string;
  categoryId: string;
  price: string;
  isAvailable: boolean;
  isPublished: boolean;
  printToKitchen: boolean;
};

function toFormState(item?: MenuItem): FormState {
  return {
    name: item?.name ?? "",
    categoryId: item ? String(item.categoryId) : "",
    price: item ? String(item.price) : "",
    isAvailable: item?.isAvailable ?? true,
    isPublished: item?.isPublished ?? true,
    printToKitchen: item?.printToKitchen ?? true,
  };
}

/**
 * Dialog dùng chung cho cả tạo mới lẫn sửa — `item` undefined nghĩa là
 * đang ở chế độ tạo mới. Điều khiển hoàn toàn qua `open`/`onOpenChange` từ
 * component cha để 1 instance duy nhất phục vụ được cả nút "Thêm món ăn"
 * trên toolbar lẫn "Sửa" trong menu thao tác từng dòng.
 */
export function MenuItemFormDialog({
  open,
  onOpenChange,
  categories,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  item?: MenuItem;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState<FormState>(() => toFormState(item));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const utils = api.useUtils();
  const create = api.menu.create.useMutation();
  const update = api.menu.update.useMutation();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(item));
      setErrors({});
    }
  }, [open, item]);

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Tên món không được để trống";
    if (!form.categoryId) nextErrors.categoryId = "Chọn danh mục";
    const price = Number(form.price);
    if (!form.price || !Number.isFinite(price) || price <= 0) {
      nextErrors.price = "Giá phải lớn hơn 0";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      price,
      isAvailable: form.isAvailable,
      isPublished: form.isPublished,
      printToKitchen: form.printToKitchen,
    };

    const mutation = isEdit
      ? update.mutateAsync({ id: item.id, ...payload })
      : create.mutateAsync(payload);

    mutation
      .then(() => {
        toaster.create({
          title: isEdit ? "Đã cập nhật món ăn" : "Đã thêm món ăn",
          type: "success",
        });
        onOpenChange(false);
        void utils.menu.list.invalidate();
      })
      .catch((error: unknown) => {
        toaster.create({
          title: "Có lỗi xảy ra",
          description: error instanceof Error ? error.message : undefined,
          type: "error",
        });
      });
  };

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa món ăn" : "Thêm món ăn"}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            <Field label="Tên món" invalid={!!errors.name} errorText={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>

            <Field label="Danh mục" invalid={!!errors.categoryId} errorText={errors.categoryId}>
              <FilterSelect
                width="full"
                placeholder="Chọn danh mục"
                value={form.categoryId}
                onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value }))}
                options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
              />
            </Field>

            <Field label="Giá (đ)" invalid={!!errors.price} errorText={errors.price}>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={form.isAvailable}
                onCheckedChange={(details) =>
                  setForm((f) => ({ ...f, isAvailable: details.checked }))
                }
              >
                Còn hàng
              </Switch>
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={form.isPublished}
                onCheckedChange={(details) =>
                  setForm((f) => ({ ...f, isPublished: details.checked }))
                }
              >
                Hiển thị trong menu
              </Switch>
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={form.printToKitchen}
                onCheckedChange={(details) =>
                  setForm((f) => ({ ...f, printToKitchen: details.checked }))
                }
              >
                In bếp
              </Switch>
            </Field>
          </Stack>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} loading={isPending}>
            {isEdit ? "Lưu" : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
