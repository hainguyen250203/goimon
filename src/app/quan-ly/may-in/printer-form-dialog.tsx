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
import { Switch } from "~/components/ui/switch";
import { toast } from "~/components/ui/toast";
import { api } from "~/trpc/react";
import type { Printer } from "~/modules/printer/domain/printer.entity";

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

type FormState = {
  name: string;
  ipAddress: string;
  port: string;
  isActive: boolean;
};

function toFormState(item?: Printer): FormState {
  return {
    name: item?.name ?? "",
    ipAddress: item?.ipAddress ?? "",
    port: item ? String(item.port) : "",
    isActive: item?.isActive ?? true,
  };
}

function isValidIpv4(value: string) {
  const match = IPV4_REGEX.exec(value);
  if (!match) return false;
  return match.slice(1, 5).every((part) => Number(part) <= 255);
}

/**
 * Dialog dùng chung cho cả tạo mới lẫn sửa — `item` undefined nghĩa là
 * đang ở chế độ tạo mới. Điều khiển hoàn toàn qua `open`/`onOpenChange` từ
 * component cha để 1 instance duy nhất phục vụ được cả nút "Thêm máy in"
 * trên toolbar lẫn "Sửa" trong menu thao tác từng dòng.
 */
export function PrinterFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Printer;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState<FormState>(() => toFormState(item));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const utils = api.useUtils();
  const create = api.printer.create.useMutation();
  const update = api.printer.update.useMutation();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(item));
      setErrors({});
    }
  }, [open, item]);

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Tên máy in không được để trống";
    if (!form.ipAddress.trim() || !isValidIpv4(form.ipAddress.trim())) {
      nextErrors.ipAddress = "Địa chỉ IP không hợp lệ";
    }
    const port = Number(form.port);
    if (!form.port || !Number.isInteger(port) || port < 1 || port > 65535) {
      nextErrors.port = "Cổng phải trong khoảng 1–65535";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      ipAddress: form.ipAddress.trim(),
      port,
      isActive: form.isActive,
    };

    const mutation = isEdit
      ? update.mutateAsync({ id: item.id, ...payload })
      : create.mutateAsync(payload);

    mutation
      .then(() => {
        toast.add({
          title: isEdit ? "Đã cập nhật máy in" : "Đã thêm máy in",
          type: "success",
        });
        onOpenChange(false);
        void utils.printer.list.invalidate();
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
          <DialogTitle>{isEdit ? "Sửa máy in" : "Thêm máy in"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin máy in."
              : "Nhập thông tin máy in mới."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="printer-name">Tên máy in</FieldLabel>
            <Input
              id="printer-name"
              value={form.name}
              aria-invalid={!!errors.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field data-invalid={!!errors.ipAddress}>
            <FieldLabel htmlFor="printer-ip">Địa chỉ IP</FieldLabel>
            <Input
              id="printer-ip"
              placeholder="192.168.1.100"
              value={form.ipAddress}
              aria-invalid={!!errors.ipAddress}
              onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
            />
            <FieldError>{errors.ipAddress}</FieldError>
          </Field>

          <Field data-invalid={!!errors.port}>
            <FieldLabel htmlFor="printer-port">Cổng</FieldLabel>
            <Input
              id="printer-port"
              type="number"
              min={1}
              max={65535}
              value={form.port}
              aria-invalid={!!errors.port}
              onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
            />
            <FieldError>{errors.port}</FieldError>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel htmlFor="printer-active">Đang hoạt động</FieldLabel>
            <Switch
              id="printer-active"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, isActive: checked }))
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
