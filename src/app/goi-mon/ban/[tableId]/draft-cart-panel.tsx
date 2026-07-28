"use client";

import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";

import { EmptyState } from "~/components/ui/empty-state";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import { formatVnd } from "~/lib/format-order";
import { useOrderCartStore, getCartTotalAmount, EMPTY_DRAFT_ITEMS } from "../../order-cart.store";
import { OrderLineItemCard } from "./order-line-item-card";

export function DraftCartPanel({
  tableId,
  onSubmitted,
}: {
  tableId: number;
  onSubmitted: () => void;
}) {
  const items = useOrderCartStore((s) => s.draftCarts[tableId] ?? EMPTY_DRAFT_ITEMS);
  const updateQuantity = useOrderCartStore((s) => s.updateQuantity);
  const updateNote = useOrderCartStore((s) => s.updateNote);
  const removeItem = useOrderCartStore((s) => s.removeItem);
  const clearCart = useOrderCartStore((s) => s.clearCart);

  const utils = api.useUtils();
  const addItems = api.order.addItems.useMutation({
    onSuccess: async () => {
      clearCart(tableId);
      toaster.create({ title: "Đã gửi món", type: "success" });
      void utils.order.listTablesForOrdering.invalidate();
      // Đợi order mới (bàn trống → vừa có đơn) load xong rồi mới chuyển tab —
      // gọi onSubmitted() ngay khi chưa refetch xong thì order ở component
      // cha vẫn đang null, effect tự-quay-về-draft (order rỗng) sẽ đá tab về
      // lại "Món đang gọi" trước khi kịp thấy tab "Món đã gọi".
      await utils.order.getTableOrder.invalidate({ tableId });
      onSubmitted();
    },
    onError: (error) => {
      toaster.create({ title: "Không gửi được món", description: error.message, type: "error" });
    },
  });

  const totalAmount = getCartTotalAmount(items);

  const handleConfirm = () => {
    addItems.mutate({
      tableId,
      items: items.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        note: i.note || undefined,
      })),
    });
  };

  if (items.length === 0) {
    return (
      <Flex flex={1} align="center" justify="center">
        <EmptyState title="Chưa có món nào" />
      </Flex>
    );
  }

  return (
    <Flex direction="column" flex={1} minH={0}>
      <Box flex={1} overflowY="auto" p={{ base: 2, lg: 3 }}>
        <Stack gap={1.5}>
          {items.map((item) => (
            <OrderLineItemCard
              key={item.menuItemId}
              name={item.name}
              unitPrice={item.price}
              quantity={item.quantity}
              note={item.note}
              editableNote
              onQuantityChange={(quantity) => updateQuantity(tableId, item.menuItemId, quantity)}
              onNoteChange={(note) => updateNote(tableId, item.menuItemId, note)}
              onRemove={() => removeItem(tableId, item.menuItemId)}
            />
          ))}
        </Stack>
      </Box>

      <Box flexShrink={0} bg="bg" borderTopWidth="1px" borderColor="border" p={{ base: 2.5, lg: 3 }}>
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize={{ base: "xs", lg: "sm" }} color="fg.muted">
            Tổng cộng
          </Text>
          <Text fontSize={{ base: "md", lg: "lg" }} fontWeight="bold" color="blue.fg">
            {formatVnd(totalAmount)}
          </Text>
        </Flex>
        <Flex gap={2}>
          <Button flex={1} variant="outline" size={{ base: "sm", lg: "md" }} onClick={() => clearCart(tableId)}>
            Huỷ
          </Button>
          <Button
            flex={1}
            colorPalette="blue"
            size={{ base: "sm", lg: "md" }}
            onClick={handleConfirm}
            loading={addItems.isPending}
          >
            Xác nhận
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
