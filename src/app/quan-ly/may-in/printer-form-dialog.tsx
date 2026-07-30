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
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import type { Printer } from "~/modules/printer/domain/printer.entity";

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

type FormState = {
  name: string;
  ipAddress: string;
  port: string;
  isActive: boolean;
};

function toFormState(item?: Printer, prefill?: { ipAddress: string; port: number }): FormState {
  return {
    name: item?.name ?? "",
    ipAddress: item?.ipAddress ?? prefill?.ipAddress ?? "",
    port: item ? String(item.port) : prefill ? String(prefill.port) : "",
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
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Printer;
  /** Điền sẵn IP/cổng khi thêm mới từ kết quả quét mạng — bỏ qua nếu đang sửa (`item` có giá trị). */
  prefill?: { ipAddress: string; port: number };
}) {
  const isEdit = !!item;
  const [form, setForm] = useState<FormState>(() => toFormState(item, prefill));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const utils = api.useUtils();
  const create = api.printer.create.useMutation();
  const update = api.printer.update.useMutation();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(item, prefill));
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, prefill?.ipAddress, prefill?.port]);

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
        toaster.create({
          title: isEdit ? "Đã cập nhật máy in" : "Đã thêm máy in",
          type: "success",
        });
        onOpenChange(false);
        void utils.printer.list.invalidate();
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
          <DialogTitle>{isEdit ? "Sửa máy in" : "Thêm máy in"}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            <Field label="Tên máy in" invalid={!!errors.name} errorText={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>

            <Field
              label="Địa chỉ IP"
              invalid={!!errors.ipAddress}
              errorText={errors.ipAddress}
            >
              <Input
                placeholder="192.168.1.100"
                value={form.ipAddress}
                onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
              />
            </Field>

            <Field label="Cổng" invalid={!!errors.port} errorText={errors.port}>
              <Input
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
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
