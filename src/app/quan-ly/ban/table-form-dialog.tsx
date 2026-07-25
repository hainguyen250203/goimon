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
import { toast } from "~/components/ui/toast";
import { api } from "~/trpc/react";
import type {
  RestaurantTable,
  TableStatus,
} from "~/modules/table/domain/restaurant-table.entity";
import type { AreaOption } from "~/modules/table/domain/restaurant-table.repository";

const STATUS_LABEL: Record<TableStatus, string> = {
  available: "Trống",
  occupied: "Đang phục vụ",
};

type FormState = {
  name: string;
  areaId: string;
  status: TableStatus;
};

function toFormState(item?: RestaurantTable): FormState {
  return {
    name: item?.name ?? "",
    areaId: item ? String(item.areaId) : "",
    status: item?.status ?? "available",
  };
}

/**
 * Dialog dùng chung cho tạo mới lẫn sửa bàn — `item` undefined nghĩa là
 * đang ở chế độ tạo mới, tương tự MenuItemFormDialog.
 */
export function TableFormDialog({
  open,
  onOpenChange,
  areas,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: AreaOption[];
  item?: RestaurantTable;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState<FormState>(() => toFormState(item));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const utils = api.useUtils();
  const create = api.table.create.useMutation();
  const update = api.table.update.useMutation();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(item));
      setErrors({});
    }
  }, [open, item]);

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Tên bàn không được để trống";
    if (!form.areaId) nextErrors.areaId = "Chọn khu vực";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      areaId: Number(form.areaId),
      status: form.status,
    };

    const mutation = isEdit
      ? update.mutateAsync({ id: item.id, ...payload })
      : create.mutateAsync(payload);

    mutation
      .then(() => {
        toast.add({
          title: isEdit ? "Đã cập nhật bàn" : "Đã thêm bàn",
          type: "success",
        });
        onOpenChange(false);
        void utils.table.list.invalidate();
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
          <DialogTitle>{isEdit ? "Sửa bàn" : "Thêm bàn"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Cập nhật thông tin bàn." : "Nhập thông tin bàn mới."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="table-name">Tên bàn</FieldLabel>
            <Input
              id="table-name"
              value={form.name}
              aria-invalid={!!errors.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field data-invalid={!!errors.areaId}>
            <FieldLabel htmlFor="table-area">Khu vực</FieldLabel>
            <Select
              value={form.areaId}
              onValueChange={(value) => setForm((f) => ({ ...f, areaId: value ?? "" }))}
            >
              <SelectTrigger id="table-area" aria-invalid={!!errors.areaId}>
                <SelectValue placeholder="Chọn khu vực">
                  {(value: string) =>
                    areas.find((a) => String(a.id) === value)?.name ?? "Chọn khu vực"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError>{errors.areaId}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="table-status">Trạng thái</FieldLabel>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, status: value as TableStatus }))
              }
            >
              <SelectTrigger id="table-status">
                <SelectValue placeholder="Trạng thái">
                  {(value: string) => STATUS_LABEL[value as TableStatus] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="available">Trống</SelectItem>
                  <SelectItem value="occupied">Đang phục vụ</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
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
