"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Button, IconButton } from "@chakra-ui/react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import type { Role } from "~/modules/role/domain/role.entity";

export function RoleRowActions({
  item,
  canEdit,
  canDelete,
}: {
  item: Role;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const utils = api.useUtils();
  const remove = api.role.delete.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã xoá vai trò", type: "success" });
      setConfirmOpen(false);
      void utils.role.list.invalidate();
    },
    onError: (error) => {
      toaster.create({ title: "Không thể xoá", description: error.message, type: "error" });
    },
  });

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
            {canEdit && (
              <MenuItem value="edit" asChild>
                <NextLink href={`/quan-ly/vai-tro/${item.id}/sua`}>
                  <Pencil size={16} />
                  Sửa
                </NextLink>
              </MenuItem>
            )}
            {canDelete && (
              <MenuItem value="delete" color="fg.error" onClick={() => setConfirmOpen(true)}>
                <Trash2 size={16} />
                Xoá
              </MenuItem>
            )}
          </MenuItemGroup>
        </MenuContent>
      </MenuRoot>

      <DialogRoot
        role="alertdialog"
        open={confirmOpen}
        onOpenChange={(e) => setConfirmOpen(e.open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá vai trò &quot;{item.name}&quot;?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            Hành động này không thể hoàn tác. Vai trò đang được gán cho người dùng nào sẽ
            không xoá được.
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Huỷ
            </Button>
            <Button
              colorPalette="red"
              onClick={() => remove.mutate({ id: item.id })}
              loading={remove.isPending}
            >
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
