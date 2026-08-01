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
import { confirmAlert } from "~/components/ui/confirm-alert";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import { TablePickerGrid } from "./table-picker-grid";

/**
 * Chuyển THẬT đơn đang phục vụ ở bàn hiện tại sang 1 bàn khác đang trống
 * (khách đổi bàn) — khác với TableSwitcherDialog (chỉ điều hướng xem/gọi món
 * ở bàn khác, không đụng dữ liệu đơn nào cả). Chỉ chọn được bàn đang trống vì
 * 1 bàn chỉ phục vụ tối đa 1 đơn tại 1 thời điểm.
 */
export function MoveOrderTableDialog({
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

  const moveTable = api.order.moveTable.useMutation({
    onSuccess: async (_data, variables) => {
      onOpenChange(false);
      void utils.order.listTablesForOrdering.invalidate();
      void utils.order.getTableOrder.invalidate({ tableId: currentTableId });
      await utils.order.getTableOrder.invalidate({ tableId: variables.targetTableId });
      router.replace(`/goi-mon/ban/${variables.targetTableId}`);
    },
    onError: (error) => {
      toaster.create({ title: "Không chuyển được bàn", description: error.message, type: "error" });
    },
  });

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent maxW={{ base: "calc(100vw - 24px)", md: "480px", lg: "600px" }} mx="auto">
        <DialogHeader>
          <DialogTitle>Chuyển bàn</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <Text fontSize="xs" color="fg.muted" mb={3}>
            Chỉ chọn được bàn còn trống — đơn đang phục vụ sẽ chuyển hết sang bàn mới.
          </Text>
          <TablePickerGrid
            areas={areas ?? []}
            tables={tables ?? []}
            currentTableId={currentTableId}
            isTableDisabled={(table) => table.activeOrder !== null}
            onSelectTable={(tableId) => {
              const table = tables?.find((t) => t.id === tableId);
              onOpenChange(false);
              confirmAlert({
                title: `Xác nhận chuyển bàn sang ${table?.name ?? "bàn đã chọn"}?`,
                description: "Đơn đang phục vụ sẽ chuyển hết sang bàn mới.",
                onConfirm: () => moveTable.mutate({ orderId, targetTableId: tableId }),
              });
            }}
            disabled={moveTable.isPending}
          />
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
