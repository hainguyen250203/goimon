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
import { FilterSelect } from "~/components/data-table/filter-select";
import { toaster } from "~/components/ui/toaster";
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
 * Dialog dùng chung cho cả tạo mới lẫn sửa — `item` undefined nghĩa là
 * đang ở chế độ tạo mới. Điều khiển hoàn toàn qua `open`/`onOpenChange` từ
 * component cha để 1 instance duy nhất phục vụ được cả nút "Thêm bàn"
 * trên toolbar lẫn "Sửa" trong menu thao tác từng dòng.
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
        toaster.create({
          title: isEdit ? "Đã cập nhật bàn" : "Đã thêm bàn",
          type: "success",
        });
        onOpenChange(false);
        void utils.table.list.invalidate();
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
          <DialogTitle>{isEdit ? "Sửa bàn" : "Thêm bàn"}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            <Field label="Tên bàn" invalid={!!errors.name} errorText={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>

            <Field label="Khu vực" invalid={!!errors.areaId} errorText={errors.areaId}>
              <FilterSelect
                width="full"
                placeholder="Chọn khu vực"
                value={form.areaId}
                onValueChange={(value) => setForm((f) => ({ ...f, areaId: value }))}
                options={areas.map((a) => ({ value: String(a.id), label: a.name }))}
              />
            </Field>

            <Field label="Trạng thái">
              <FilterSelect
                width="full"
                placeholder="Trạng thái"
                value={form.status}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, status: value as TableStatus }))
                }
                options={[
                  { value: "available", label: STATUS_LABEL.available },
                  { value: "occupied", label: STATUS_LABEL.occupied },
                ]}
              />
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
