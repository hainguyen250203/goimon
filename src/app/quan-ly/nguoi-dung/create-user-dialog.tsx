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
import type { UserRole } from "~/modules/user/domain/user-account.entity";
import { ROLE_LABEL } from "./user-list";

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
 * có dữ liệu hồ sơ nào khác đáng sửa ngoài vai trò (đổi vai trò dùng dialog
 * nhỏ riêng ở user-row-actions.tsx) và trạng thái cấm/bỏ cấm.
 */
export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
        toast.add({ title: "Đã tạo tài khoản", type: "success" });
        onOpenChange(false);
        void utils.user.list.invalidate();
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
          <DialogTitle>Thêm người dùng</DialogTitle>
          <DialogDescription>Tạo tài khoản nhân viên mới.</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="user-name">Tên</FieldLabel>
            <Input
              id="user-name"
              value={form.name}
              aria-invalid={!!errors.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field data-invalid={!!errors.phoneNumber}>
            <FieldLabel htmlFor="user-phone">Số điện thoại</FieldLabel>
            <Input
              id="user-phone"
              value={form.phoneNumber}
              aria-invalid={!!errors.phoneNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, phoneNumber: e.target.value }))
              }
            />
            <FieldError>{errors.phoneNumber}</FieldError>
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="user-password">Mật khẩu</FieldLabel>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              aria-invalid={!!errors.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
            />
            <FieldError>{errors.password}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="user-role">Vai trò</FieldLabel>
            <Select
              value={form.role}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, role: (value ?? "user") as UserRole }))
              }
            >
              <SelectTrigger id="user-role">
                <SelectValue placeholder="Chọn vai trò">
                  {(value: string) =>
                    ROLE_LABEL[value as UserRole] ?? "Chọn vai trò"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="user">Nhân viên</SelectItem>
                  <SelectItem value="manager">Quản lý</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
