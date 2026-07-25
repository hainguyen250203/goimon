"use client";

import { useEffect, useState } from "react";
import { Button, Input, Stack, Text } from "@chakra-ui/react";

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
import { toaster } from "~/components/ui/toaster";
import { FilterSelect } from "~/components/data-table/filter-select";
import { api } from "~/trpc/react";
import type { DiscountType, Promotion } from "~/modules/promotion/domain/promotion.entity";

const DISCOUNT_TYPE_OPTIONS: { value: DiscountType; label: string }[] = [
  { value: "percent", label: "Phần trăm (%)" },
  { value: "fixed", label: "Số tiền cố định (đ)" },
];

type FormState = {
  name: string;
  discountType: DiscountType;
  discountValue: string;
  isActive: boolean;
};

function toFormState(item?: Promotion): FormState {
  return {
    name: item?.name ?? "",
    discountType: item?.discountType ?? "percent",
    discountValue: item ? String(item.discountValue) : "",
    isActive: item?.isActive ?? true,
  };
}

/**
 * Dialog dùng chung cho cả tạo mới lẫn sửa — `item` undefined nghĩa là
 * đang ở chế độ tạo mới. Điều khiển hoàn toàn qua `open`/`onOpenChange` từ
 * component cha để 1 instance duy nhất phục vụ được cả nút "Thêm khuyến
 * mãi" trên toolbar lẫn "Sửa" trong menu thao tác từng dòng.
 */
export function PromotionFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Promotion;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState<FormState>(() => toFormState(item));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const utils = api.useUtils();
  const create = api.promotion.create.useMutation();
  const update = api.promotion.update.useMutation();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(item));
      setErrors({});
    }
  }, [open, item]);

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Tên khuyến mãi không được để trống";
    const discountValue = Number(form.discountValue);
    if (!form.discountValue || !Number.isInteger(discountValue) || discountValue <= 0) {
      nextErrors.discountValue = "Giá trị giảm phải là số nguyên lớn hơn 0";
    } else if (form.discountType === "percent" && discountValue > 100) {
      nextErrors.discountValue = "Giảm theo phần trăm tối đa 100%";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue,
      isActive: form.isActive,
    };

    const mutation = isEdit
      ? update.mutateAsync({ id: item.id, ...payload })
      : create.mutateAsync(payload);

    mutation
      .then(() => {
        toaster.create({
          title: isEdit ? "Đã cập nhật khuyến mãi" : "Đã thêm khuyến mãi",
          type: "success",
        });
        onOpenChange(false);
        void utils.promotion.list.invalidate();
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
          <DialogTitle>{isEdit ? "Sửa khuyến mãi" : "Thêm khuyến mãi"}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            <Field label="Tên khuyến mãi" invalid={!!errors.name} errorText={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>

            <Field label="Loại giảm giá">
              <FilterSelect
                value={form.discountType}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, discountType: value as DiscountType }))
                }
                options={DISCOUNT_TYPE_OPTIONS}
              />
            </Field>

            <Field
              label={form.discountType === "percent" ? "Giá trị giảm (%)" : "Giá trị giảm (đ)"}
              invalid={!!errors.discountValue}
              errorText={errors.discountValue}
            >
              <Input
                type="number"
                min={1}
                max={form.discountType === "percent" ? 100 : undefined}
                value={form.discountValue}
                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
              />
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={form.isActive}
                onCheckedChange={(details) =>
                  setForm((f) => ({ ...f, isActive: details.checked }))
                }
              >
                Đang hoạt động
              </Switch>
            </Field>
            {!form.isActive && (
              <Text fontSize="xs" color="fg.muted">
                Khuyến mãi ngừng hoạt động sẽ không hiện trong danh sách chọn ở màn hình gọi món.
              </Text>
            )}
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
