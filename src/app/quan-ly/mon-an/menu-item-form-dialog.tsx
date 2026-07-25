"use client";

import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { toast } from "~/components/ui/toast";
import { api } from "~/trpc/react";
import type { MenuItem } from "~/modules/menu/domain/menu-item.entity";
import type { CategoryOption } from "~/modules/menu/domain/menu-item.repository";

type FormState = {
  name: string;
  categoryId: string;
  price: string;
  isAvailable: boolean;
  isPublished: boolean;
};

function toFormState(item?: MenuItem): FormState {
  return {
    name: item?.name ?? "",
    categoryId: item ? String(item.categoryId) : "",
    price: item ? String(item.price) : "",
    isAvailable: item?.isAvailable ?? true,
    isPublished: item?.isPublished ?? true,
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
    };

    const mutation = isEdit
      ? update.mutateAsync({ id: item.id, ...payload })
      : create.mutateAsync(payload);

    mutation
      .then(() => {
        toast.add({
          title: isEdit ? "Đã cập nhật món ăn" : "Đã thêm món ăn",
          type: "success",
        });
        onOpenChange(false);
        void utils.menu.list.invalidate();
      })
      .catch((error: unknown) => {
        toast.add({
          title: "Có lỗi xảy ra",
          description: error instanceof Error ? error.message : undefined,
          type: "error",
        });
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa món ăn" : "Thêm món ăn"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin món ăn."
              : "Nhập thông tin món ăn mới."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="menu-item-name">Tên món</FieldLabel>
            <Input
              id="menu-item-name"
              value={form.name}
              aria-invalid={!!errors.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field data-invalid={!!errors.categoryId}>
            <FieldLabel htmlFor="menu-item-category">Danh mục</FieldLabel>
            <Select
              value={form.categoryId}
              onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value ?? "" }))}
            >
              <SelectTrigger id="menu-item-category" aria-invalid={!!errors.categoryId}>
                <SelectValue placeholder="Chọn danh mục">
                  {(value: string) =>
                    categories.find((c) => String(c.id) === value)?.name ?? "Chọn danh mục"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError>{errors.categoryId}</FieldError>
          </Field>

          <Field data-invalid={!!errors.price}>
            <FieldLabel htmlFor="menu-item-price">Giá (đ)</FieldLabel>
            <Input
              id="menu-item-price"
              type="number"
              min={0}
              value={form.price}
              aria-invalid={!!errors.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            <FieldError>{errors.price}</FieldError>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel htmlFor="menu-item-available">Còn hàng</FieldLabel>
            <Switch
              id="menu-item-available"
              checked={form.isAvailable}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, isAvailable: checked }))
              }
            />
          </Field>

          <Field orientation="horizontal">
            <FieldLabel htmlFor="menu-item-published">Hiển thị trong menu</FieldLabel>
            <Switch
              id="menu-item-published"
              checked={form.isPublished}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, isPublished: checked }))
              }
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isEdit ? "Lưu" : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
