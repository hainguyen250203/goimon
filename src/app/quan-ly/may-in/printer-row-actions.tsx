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
import type { Printer } from "~/modules/printer/domain/printer.entity";

export function PrinterRowActions({
  item,
  onEdit,
}: {
  item: Printer;
  onEdit: (item: Printer) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const utils = api.useUtils();
  const remove = api.printer.delete.useMutation({
    onSuccess: () => {
      toast.add({ title: "Đã xoá máy in", type: "success" });
      void utils.printer.list.invalidate();
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
            <AlertDialogTitle>Xoá máy in "{item.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác.
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
