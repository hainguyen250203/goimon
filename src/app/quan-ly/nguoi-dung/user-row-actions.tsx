"use client";

import { useEffect, useState } from "react";
import { Button, IconButton } from "@chakra-ui/react";
import { KeyRound, MoreHorizontal, ShieldBan, ShieldCheck, UserCog } from "lucide-react";

import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import { Field } from "~/components/ui/field";
import { FilterSelect } from "~/components/data-table/filter-select";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import type { UserAccount, UserRole } from "~/modules/user/domain/user-account.entity";
import { ROLE_LABEL } from "./role-label";
import { ResetPasswordDialog } from "./reset-password-dialog";

/**
 * Không có khái niệm "xoá" tài khoản hợp lý ở đây (order.createdBy tham
 * chiếu user.id, BetterAuth cũng không kỳ vọng bị xoá thẳng qua adapter) —
 * Cấm/Bỏ cấm đóng vai trò tương đương xoá/khôi phục trong UI.
 */
export function UserRowActions({
  user,
  viewerRole,
}: {
  user: UserAccount;
  /** Chỉ superadmin mới gán được vai trò superadmin — ẩn option này khỏi
   * dropdown nếu người xem không phải superadmin (server tự chặn lại ở
   * user.router.ts, đây chỉ là UX). */
  viewerRole: UserRole;
}) {
  const roleOptions = (Object.keys(ROLE_LABEL) as UserRole[])
    .filter((r) => r !== "superadmin" || viewerRole === "superadmin")
    .map((value) => ({ value, label: ROLE_LABEL[value] }));
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);

  const utils = api.useUtils();

  const setRole = api.user.setRole.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã đổi vai trò", type: "success" });
      setRoleDialogOpen(false);
      void utils.user.list.invalidate();
    },
    onError: (error) => {
      toaster.create({
        title: "Không thể đổi vai trò",
        description: error.message,
        type: "error",
      });
    },
  });

  const ban = api.user.ban.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã cấm người dùng", type: "success" });
      setBanConfirmOpen(false);
      void utils.user.list.invalidate();
    },
    onError: (error) => {
      toaster.create({
        title: "Không thể cấm",
        description: error.message,
        type: "error",
      });
    },
  });

  const unban = api.user.unban.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã bỏ cấm người dùng", type: "success" });
      void utils.user.list.invalidate();
    },
    onError: (error) => {
      toaster.create({
        title: "Không thể bỏ cấm",
        description: error.message,
        type: "error",
      });
    },
  });

  useEffect(() => {
    if (roleDialogOpen) setSelectedRole(user.role);
  }, [roleDialogOpen, user.role]);

  return (
    <>
      <MenuRoot positioning={{ placement: "bottom-end" }}>
        <MenuTrigger asChild>
          <IconButton variant="ghost" size="sm" aria-label="Thao tác">
            <MoreHorizontal size={16} />
          </IconButton>
        </MenuTrigger>
        <MenuContent minW="10rem">
          <MenuItemGroup>
            <MenuItem value="role" onClick={() => setRoleDialogOpen(true)}>
              <UserCog size={16} />
              Đổi vai trò
            </MenuItem>
            <MenuItem value="reset-password" onClick={() => setResetPasswordOpen(true)}>
              <KeyRound size={16} />
              Đặt lại mật khẩu
            </MenuItem>
            {user.banned ? (
              <MenuItem value="unban" onClick={() => unban.mutate({ userId: user.id })}>
                <ShieldCheck size={16} />
                Bỏ cấm
              </MenuItem>
            ) : (
              <MenuItem
                value="ban"
                color="fg.error"
                onClick={() => setBanConfirmOpen(true)}
              >
                <ShieldBan size={16} />
                Cấm
              </MenuItem>
            )}
          </MenuItemGroup>
        </MenuContent>
      </MenuRoot>

      <DialogRoot open={roleDialogOpen} onOpenChange={(e) => setRoleDialogOpen(e.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi vai trò cho &quot;{user.name}&quot;</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Field label="Vai trò">
              <FilterSelect
                width="full"
                placeholder="Chọn vai trò"
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRole)}
                options={roleOptions}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              onClick={() => setRole.mutate({ userId: user.id, role: selectedRole })}
              loading={setRole.isPending}
              disabled={selectedRole === user.role}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot
        role="alertdialog"
        open={banConfirmOpen}
        onOpenChange={(e) => setBanConfirmOpen(e.open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cấm người dùng &quot;{user.name}&quot;?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            Người dùng bị cấm sẽ không thể đăng nhập vào hệ thống cho đến khi
            được bỏ cấm.
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanConfirmOpen(false)}>
              Huỷ
            </Button>
            <Button
              colorPalette="red"
              onClick={() => ban.mutate({ userId: user.id })}
              loading={ban.isPending}
            >
              Cấm
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <ResetPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        userId={user.id}
        userName={user.name}
      />
    </>
  );
}
