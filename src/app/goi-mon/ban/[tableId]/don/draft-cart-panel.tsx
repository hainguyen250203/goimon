"use client";

import { useEffect, useState } from "react";
import { Box, Button, Flex, IconButton, Input, Stack, Text } from "@chakra-ui/react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "~/components/ui/empty-state";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import {
  useOrderCartStore,
  getCartTotalAmount,
  EMPTY_DRAFT_ITEMS,
  type DraftCartItem,
} from "../../../order-cart.store";

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function DraftItemRow({
  item,
  onQuantityChange,
  onNoteChange,
  onRemove,
}: {
  item: DraftCartItem;
  onQuantityChange: (quantity: number) => void;
  onNoteChange: (note: string) => void;
  onRemove: () => void;
}) {
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));

  useEffect(() => {
    setQuantityInput(String(item.quantity));
  }, [item.quantity]);

  const commitQuantity = () => {
    const parsed = Math.floor(Number(quantityInput));
    if (!Number.isFinite(parsed) || parsed === item.quantity) {
      setQuantityInput(String(item.quantity));
      return;
    }
    if (parsed <= 0) {
      onRemove();
      return;
    }
    onQuantityChange(parsed);
  };

  return (
    <Box bg="bg" p={{ base: 2, lg: 3 }} rounded="l2" borderWidth="1px" borderColor="border">
      <Flex justify="space-between" align="start" mb={{ base: 1.5, lg: 2 }}>
        <Box flex={1}>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold">
            {item.name}
          </Text>
          <Text fontSize="xs" color="blue.fg">
            {formatVnd(item.price)} × {item.quantity}
          </Text>
        </Box>
        <IconButton
          size={{ base: "xs", lg: "sm" }}
          variant="ghost"
          colorPalette="red"
          aria-label="Xoá món"
          onClick={onRemove}
        >
          <Trash2 size={14} />
        </IconButton>
      </Flex>

      <Input
        size={{ base: "xs", lg: "sm" }}
        placeholder="Ghi chú cho món"
        mb={{ base: 1.5, lg: 2 }}
        value={item.note}
        onChange={(e) => onNoteChange(e.target.value)}
      />

      <Flex align="center" justify="space-between">
        <Flex align="center" gap={{ base: 1.5, lg: 2 }}>
          <IconButton
            size={{ base: "xs", lg: "sm" }}
            variant="outline"
            aria-label="Giảm số lượng"
            disabled={item.quantity <= 1}
            onClick={() => onQuantityChange(item.quantity - 1)}
          >
            <Minus size={13} />
          </IconButton>
          <Input
            size={{ base: "xs", lg: "sm" }}
            type="number"
            min={1}
            textAlign="center"
            w={{ base: "40px", lg: "48px" }}
            px={1}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            onBlur={commitQuantity}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <IconButton
            size={{ base: "xs", lg: "sm" }}
            variant="outline"
            aria-label="Tăng số lượng"
            onClick={() => onQuantityChange(item.quantity + 1)}
          >
            <Plus size={13} />
          </IconButton>
        </Flex>
        <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="bold" color="blue.fg">
          {formatVnd(item.price * item.quantity)}
        </Text>
      </Flex>
    </Box>
  );
}

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
    onSuccess: () => {
      clearCart(tableId);
      toaster.create({ title: "Đã gửi món", type: "success" });
      void utils.order.getTableOrder.invalidate({ tableId });
      void utils.order.listTablesForOrdering.invalidate();
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
        <Stack gap={{ base: 1.5, lg: 2 }}>
          {items.map((item) => (
            <DraftItemRow
              key={item.menuItemId}
              item={item}
              onQuantityChange={(quantity) => updateQuantity(tableId, item.menuItemId, quantity)}
              onNoteChange={(note) => updateNote(tableId, item.menuItemId, note)}
              onRemove={() => removeItem(tableId, item.menuItemId)}
            />
          ))}
        </Stack>
      </Box>

      <Box flexShrink={0} bg="bg" borderTopWidth="1px" borderColor="border" p={{ base: 3, lg: 4 }}>
        <Flex justify="space-between" align="center" mb={{ base: 2, lg: 3 }}>
          <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="semibold">
            Tổng cộng
          </Text>
          <Text fontSize={{ base: "lg", lg: "xl" }} fontWeight="bold" color="blue.fg">
            {formatVnd(totalAmount)}
          </Text>
        </Flex>
        <Flex gap={{ base: 2, lg: 3 }}>
          <Button flex={1} variant="outline" size={{ base: "md", lg: "lg" }} onClick={() => clearCart(tableId)}>
            Huỷ
          </Button>
          <Button
            flex={1}
            colorPalette="blue"
            size={{ base: "md", lg: "lg" }}
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
