"use client";

import { useState } from "react";
import { Box, Flex, IconButton, Separator, Stack, Text } from "@chakra-ui/react";
import { Minus, Plus } from "lucide-react";

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
import type { RouterOutputs } from "~/trpc/react";
import { formatVnd } from "~/lib/format-order";
import { thinScrollbar } from "~/lib/scrollbar";
import { TablePickerGrid } from "./table-picker-grid";
import { showPrintResultToast } from "./print-result-toast";

type OrderDetail = NonNullable<RouterOutputs["order"]["getTableOrder"]>;

/**
 * Chuyển 1 phần món (có thể chỉ 1 phần số lượng) từ đơn đang mở ở bàn này
 * sang order_id của bàn khác — gộp vào đơn đang mở sẵn ở bàn đích, hoặc tự mở
 * đơn mới nếu bàn đích đang trống. Khác MoveOrderTableDialog (chuyển NGUYÊN
 * đơn sang bàn TRỐNG) — đơn nguồn ở đây vẫn tiếp tục tồn tại nếu còn món, và
 * bàn đích được phép đang có đơn sẵn (ca dùng chính là gộp vào đơn đó).
 */
export function TransferItemsDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDetail;
}) {
  const utils = api.useUtils();
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const { data: areas } = api.table.listAreas.useQuery(undefined, { enabled: open });
  const { data: tables } = api.order.listTablesForOrdering.useQuery(undefined, { enabled: open });

  const resetAndClose = () => {
    onOpenChange(false);
    setQuantities({});
  };

  const transferItems = api.order.transferItems.useMutation({
    onSuccess: async (data, variables) => {
      showPrintResultToast(data.printResult, { label: "phiếu bếp", silentOnSuccess: true });
      resetAndClose();
      void utils.order.listTablesForOrdering.invalidate();
      void utils.order.getTableOrder.invalidate({ tableId: variables.targetTableId });
      await utils.order.getTableOrder.invalidate({ tableId: order.tableId });
    },
    onError: (error) => {
      toaster.create({ title: "Không chuyển được món", description: error.message, type: "error" });
    },
  });

  const setQty = (itemId: number, qty: number, max: number) => {
    setQuantities((q) => ({ ...q, [itemId]: Math.max(0, Math.min(qty, max)) }));
  };

  const selectedItems = order.items
    .map((item) => ({ item, quantity: quantities[item.id!] ?? 0 }))
    .filter((x) => x.quantity > 0);

  const handleSelectTable = (targetTableId: number) => {
    if (targetTableId === order.tableId || selectedItems.length === 0) return;
    transferItems.mutate({
      sourceOrderId: order.id,
      items: selectedItems.map((x) => ({ itemId: x.item.id!, quantity: x.quantity })),
      targetTableId,
    });
  };

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => {
        if (!e.open) resetAndClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent maxW={{ base: "calc(100vw - 24px)", md: "480px", lg: "600px" }} mx="auto">
        <DialogHeader>
          <DialogTitle>Chuyển món sang bàn khác</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <Text fontSize="xs" color="fg.muted" mb={2}>
            Chọn số lượng món cần chuyển, sau đó chọn bàn nhận.
          </Text>

          <Stack gap={1} maxH="30vh" overflowY="auto" overscrollBehavior="contain" css={thinScrollbar} mb={3}>
            {order.items.map((item) => {
              const qty = quantities[item.id!] ?? 0;
              return (
                <Flex
                  key={item.id}
                  align="center"
                  gap={2}
                  p={2}
                  rounded="l2"
                  bg={qty > 0 ? "blue.subtle" : "bg.muted"}
                >
                  <Box flex={1} minW={0}>
                    <Text fontSize="xs" fontWeight="medium" lineClamp={1}>
                      {item.itemName}
                    </Text>
                    <Text fontSize="2xs" color="fg.muted" lineClamp={1}>
                      Đang có {item.quantity} · {formatVnd(item.unitPrice)}
                      {item.note ? ` · ${item.note}` : ""}
                    </Text>
                  </Box>
                  <Flex align="center" gap={1} flexShrink={0}>
                    <IconButton
                      size="xs"
                      variant="outline"
                      aria-label="Giảm"
                      disabled={qty === 0}
                      onClick={() => setQty(item.id!, qty - 1, item.quantity)}
                    >
                      <Minus size={12} />
                    </IconButton>
                    <Text fontSize="xs" fontWeight="semibold" w="20px" textAlign="center">
                      {qty}
                    </Text>
                    <IconButton
                      size="xs"
                      variant="outline"
                      aria-label="Tăng"
                      disabled={qty >= item.quantity}
                      onClick={() => setQty(item.id!, qty + 1, item.quantity)}
                    >
                      <Plus size={12} />
                    </IconButton>
                  </Flex>
                </Flex>
              );
            })}
          </Stack>

          <Separator mb={3} />

          <Text fontSize="xs" fontWeight="semibold" mb={2}>
            Chuyển tới bàn
          </Text>
          <TablePickerGrid
            areas={areas ?? []}
            tables={tables ?? []}
            currentTableId={order.tableId}
            onSelectTable={handleSelectTable}
            disabled={transferItems.isPending || selectedItems.length === 0}
          />
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
