"use client";

import { useRouter } from "nextjs-toploader/app";
import { Text } from "@chakra-ui/react";

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import { TablePickerGrid } from "./table-picker-grid";

/**
 * Gộp NGUYÊN đơn đang mở ở bàn hiện tại vào đơn đang mở SẴN ở bàn khác (khách
 * ghép bàn) — khác MoveOrderTableDialog (chuyển sang bàn TRỐNG) và
 * TransferItemsDialog (chuyển từng phần món, đơn nguồn có thể vẫn còn tồn
 * tại). Chỉ chọn được bàn ĐANG có đơn mở — nếu bàn đích trống thì đây không
 * phải gộp, dùng "Chuyển bàn" thay thế.
 */
export function MergeOrdersDialog({
  open,
  onOpenChange,
  currentTableId,
  orderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTableId: number;
  orderId: number;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: areas } = api.table.listAreas.useQuery(undefined, { enabled: open });
  const { data: tables } = api.order.listTablesForOrdering.useQuery(undefined, { enabled: open });

  const mergeMutation = api.order.mergeOrders.useMutation({
    onSuccess: async (_data, variables) => {
      onOpenChange(false);
      void utils.order.listTablesForOrdering.invalidate();
      void utils.order.getTableOrder.invalidate({ tableId: currentTableId });
      await utils.order.getTableOrder.invalidate({ tableId: variables.targetTableId });
      router.replace(`/goi-mon/ban/${variables.targetTableId}`);
    },
    onError: (error) => {
      toaster.create({ title: "Không gộp được đơn", description: error.message, type: "error" });
    },
  });

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent maxW={{ base: "calc(100vw - 24px)", md: "480px", lg: "600px" }} mx="auto">
        <DialogHeader>
          <DialogTitle>Gộp đơn với bàn khác</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <Text fontSize="xs" color="fg.muted" mb={3}>
            Chỉ chọn được bàn đang có đơn mở — toàn bộ món ở bàn này sẽ gộp sang đơn đó, bàn này trở
            thành trống.
          </Text>
          <TablePickerGrid
            areas={areas ?? []}
            tables={tables ?? []}
            currentTableId={currentTableId}
            isTableDisabled={(table) => table.activeOrder === null}
            onSelectTable={(tableId) => mergeMutation.mutate({ sourceOrderId: orderId, targetTableId: tableId })}
            disabled={mergeMutation.isPending}
          />
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
