"use client";

import { useRouter } from "nextjs-toploader/app";

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { TablePickerGrid } from "./table-picker-grid";

/**
 * Điều hướng NHANH sang xem/gọi món ở bàn khác — tránh phải back về /goi-mon
 * rồi chọn lại. KHÔNG đụng đơn đang có ở bàn hiện tại. Chuyển thật đơn đang
 * phục vụ sang bàn khác là tính năng riêng, xem move-order-table-dialog.tsx.
 */
export function TableSwitcherDialog({
  open,
  onOpenChange,
  currentTableId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTableId: number;
}) {
  const router = useRouter();
  const { data: areas } = api.table.listAreas.useQuery(undefined, { enabled: open });
  const { data: tables } = api.order.listTablesForOrdering.useQuery(undefined, { enabled: open });

  const handleSelect = (tableId: number) => {
    onOpenChange(false);
    if (tableId !== currentTableId) router.push(`/goi-mon/ban/${tableId}`);
  };

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent maxW={{ base: "calc(100vw - 24px)", md: "480px", lg: "600px" }} mx="auto">
        <DialogHeader>
          <DialogTitle>Xem bàn khác</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <TablePickerGrid
            areas={areas ?? []}
            tables={tables ?? []}
            currentTableId={currentTableId}
            onSelectTable={handleSelect}
          />
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
