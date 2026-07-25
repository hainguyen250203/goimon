"use client";

import { useState } from "react";
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
import type { MenuItem as MenuItemEntity } from "~/modules/menu/domain/menu-item.entity";

export function MenuItemRowActions({
  item,
  onEdit,
}: {
  item: MenuItemEntity;
  onEdit: (item: MenuItemEntity) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const utils = api.useUtils();
  const remove = api.menu.delete.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã xoá món ăn", type: "success" });
      void utils.menu.list.invalidate();
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
            <MenuItem value="edit" onClick={() => onEdit(item)}>
              <Pencil size={16} />
              Sửa
            </MenuItem>
            <MenuItem value="delete" color="fg.error" onClick={() => setConfirmOpen(true)}>
              <Trash2 size={16} />
              Xoá
            </MenuItem>
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
            <DialogTitle>Xoá món ăn &quot;{item.name}&quot;?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            Hành động này không thể hoàn tác. Nếu món đã từng nằm trong đơn
            hàng, hệ thống sẽ báo không thể xoá — hãy ẩn món thay vì xoá
            trong trường hợp đó.
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
