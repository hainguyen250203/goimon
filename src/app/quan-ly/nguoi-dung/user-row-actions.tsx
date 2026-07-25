"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, ShieldBan, ShieldCheck, UserCog } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Field, FieldLabel } from "~/components/ui/field";
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
import type { UserAccount, UserRole } from "~/modules/user/domain/user-account.entity";
import { ROLE_LABEL } from "./user-list";

/**
 * Không có khái niệm "xoá" tài khoản hợp lý ở đây (order.createdBy tham
 * chiếu user.id, BetterAuth cũng không kỳ vọng bị xoá thẳng qua adapter) —
 * Cấm/Bỏ cấm đóng vai trò tương đương xoá/khôi phục trong UI.
 */
export function UserRowActions({ user }: { user: UserAccount }) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);

  const utils = api.useUtils();

  const setRole = api.user.setRole.useMutation({
    onSuccess: () => {
      toast.add({ title: "Đã đổi vai trò", type: "success" });
      setRoleDialogOpen(false);
      void utils.user.list.invalidate();
    },
    onError: (error) => {
      toast.add({
        title: "Không thể đổi vai trò",
        description: error.message,
        type: "error",
      });
    },
  });

  const ban = api.user.ban.useMutation({
    onSuccess: () => {
      toast.add({ title: "Đã cấm người dùng", type: "success" });
      void utils.user.list.invalidate();
    },
    onError: (error) => {
      toast.add({
        title: "Không thể cấm",
        description: error.message,
        type: "error",
      });
    },
  });

  const unban = api.user.unban.useMutation({
    onSuccess: () => {
      toast.add({ title: "Đã bỏ cấm người dùng", type: "success" });
      void utils.user.list.invalidate();
    },
    onError: (error) => {
      toast.add({
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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Thao tác">
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setRoleDialogOpen(true)}>
              <UserCog data-icon="inline-start" />
              Đổi vai trò
            </DropdownMenuItem>
            {user.banned ? (
              <DropdownMenuItem onClick={() => unban.mutate({ userId: user.id })}>
                <ShieldCheck data-icon="inline-start" />
                Bỏ cấm
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setBanConfirmOpen(true)}
              >
                <ShieldBan data-icon="inline-start" />
                Cấm
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi vai trò cho &quot;{user.name}&quot;</DialogTitle>
            <DialogDescription>
              Chọn vai trò mới cho người dùng này.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="row-role">Vai trò</FieldLabel>
            <Select
              value={selectedRole}
              onValueChange={(value) =>
                setSelectedRole((value ?? "user") as UserRole)
              }
            >
              <SelectTrigger id="row-role">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              onClick={() => setRole.mutate({ userId: user.id, role: selectedRole })}
              disabled={setRole.isPending || selectedRole === user.role}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={banConfirmOpen} onOpenChange={setBanConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cấm người dùng &quot;{user.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Người dùng bị cấm sẽ không thể đăng nhập vào hệ thống cho đến
              khi được bỏ cấm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => ban.mutate({ userId: user.id })}
              disabled={ban.isPending}
            >
              Cấm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
