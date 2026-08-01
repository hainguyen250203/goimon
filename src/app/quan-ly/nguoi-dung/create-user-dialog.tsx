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
import { NumericInput } from "~/components/ui/numeric-input";
import { FilterSelect } from "~/components/data-table/filter-select";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import type { UserRole } from "~/modules/user/domain/user-account.entity";
import { ROLE_LABEL } from "./role-label";

type FormState = {
  name: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
};

const EMPTY_FORM: FormState = {
  name: "",
  phoneNumber: "",
  password: "",
  role: "user",
};

const PHONE_NUMBER_REGEX = /^0\d{9}$/;

/**
 * Chỉ có dialog tạo mới — không có dialog "sửa" đầy đủ vì tài khoản không
 * có dữ liệu hồ sơ nào khác đáng sửa ngoài vai trò, mật khẩu, và trạng thái
 * cấm/bỏ cấm (mỗi cái 1 dialog nhỏ riêng ở user-row-actions.tsx).
 */
export function CreateUserDialog({
  open,
  onOpenChange,
  viewerRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chỉ superadmin mới gán được vai trò superadmin cho người khác — ẩn hẳn
   * option này khỏi dropdown nếu người xem không phải superadmin (server vẫn
   * tự chặn lại ở user.router.ts, đây chỉ là UX). */
  viewerRole: UserRole;
}) {
  const roleOptions = (Object.keys(ROLE_LABEL) as UserRole[])
    .filter((r) => r !== "superadmin" || viewerRole === "superadmin")
    .map((value) => ({ value, label: ROLE_LABEL[value] }));
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const utils = api.useUtils();
  const create = api.user.create.useMutation();

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setErrors({});
    }
  }, [open]);

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Tên không được để trống";
    if (!PHONE_NUMBER_REGEX.test(form.phoneNumber)) {
      nextErrors.phoneNumber = "Số điện thoại không hợp lệ (vd: 0912345678)";
    }
    if (form.password.length < 8) {
      nextErrors.password = "Mật khẩu tối thiểu 8 ký tự";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    create
      .mutateAsync({
        name: form.name.trim(),
        phoneNumber: form.phoneNumber,
        password: form.password,
        role: form.role,
      })
      .then(() => {
        toaster.create({ title: "Đã tạo tài khoản", type: "success" });
        onOpenChange(false);
        void utils.user.list.invalidate();
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
          <DialogTitle>Thêm người dùng</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            <Field label="Tên" invalid={!!errors.name} errorText={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>

            <Field
              label="Số điện thoại"
              invalid={!!errors.phoneNumber}
              errorText={errors.phoneNumber}
            >
              <NumericInput
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                }
              />
            </Field>

            <Field
              label="Mật khẩu"
              invalid={!!errors.password}
              errorText={errors.password}
            >
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </Field>

            <Field label="Vai trò">
              <FilterSelect
                width="full"
                placeholder="Chọn vai trò"
                value={form.role}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, role: value as UserRole }))
                }
                options={roleOptions}
              />
            </Field>
          </Stack>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} loading={create.isPending}>
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
