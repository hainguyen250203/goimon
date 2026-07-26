"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@chakra-ui/react";

import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field } from "~/components/ui/field";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setError("");
    }
  }, [open]);

  const setPassword = api.user.setPassword.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã đặt lại mật khẩu", type: "success" });
      onOpenChange(false);
    },
    onError: (err) => {
      toaster.create({ title: "Không đặt lại được mật khẩu", description: err.message, type: "error" });
    },
  });

  const handleSubmit = () => {
    if (newPassword.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự");
      return;
    }
    setPassword.mutate({ userId, newPassword });
  };

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đặt lại mật khẩu cho &quot;{userName}&quot;</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Field label="Mật khẩu mới" invalid={!!error} errorText={error}>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} loading={setPassword.isPending}>
            Đặt lại mật khẩu
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
