"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { toast } from "~/components/ui/toast";
import { api } from "~/trpc/react";
import type { RestaurantTable } from "~/modules/table/domain/restaurant-table.entity";

export function TableRowActions({
  item,
  onEdit,
}: {
  item: RestaurantTable;
  onEdit: (item: RestaurantTable) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const utils = api.useUtils();
  const remove = api.table.delete.useMutation({
    onSuccess: () => {
      toast.add({ title: "Đã xoá bàn", type: "success" });
      void utils.table.list.invalidate();
    },
    onError: (error) => {
      toast.add({ title: "Không thể xoá", description: error.message, type: "error" });
    },
  });

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
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Pencil data-icon="inline-start" />
              Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 data-icon="inline-start" />
              Xoá
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá bàn "{item.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Nếu bàn đã có lịch sử đơn
              hàng, hệ thống sẽ báo không thể xoá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => remove.mutate({ id: item.id })}
              disabled={remove.isPending}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
