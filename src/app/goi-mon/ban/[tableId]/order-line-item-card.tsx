"use client";

import { Box, Flex, IconButton, Input, Text } from "@chakra-ui/react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { formatVnd } from "~/lib/format-order";

/**
 * Card món ăn dùng chung cho tab "Món đang gọi" (ghi chú sửa được, chưa
 * submit) và "Món đã gọi" (ghi chú chỉ đọc, có thể disabled lúc đang lưu) —
 * 2 tab trước đây tự định nghĩa 2 card gần như giống hệt nhau.
 */
export function OrderLineItemCard({
  name,
  unitPrice,
  quantity,
  note,
  editableNote,
  disabled = false,
  onQuantityChange,
  onNoteChange,
  onRemove,
}: {
  name: string;
  unitPrice: number;
  quantity: number;
  note?: string | null;
  editableNote: boolean;
  disabled?: boolean;
  onQuantityChange: (quantity: number) => void;
  onNoteChange?: (note: string) => void;
  onRemove: () => void;
}) {
  const [quantityInput, setQuantityInput] = useState(String(quantity));

  // Đồng bộ lại khi số lượng đổi từ nơi khác (nút +/-) — effect chỉ chạy khi
  // quantity thực sự đổi, không đè lúc đang gõ dở.
  useEffect(() => {
    setQuantityInput(String(quantity));
  }, [quantity]);

  const commitQuantity = () => {
    const parsed = Math.floor(Number(quantityInput));
    if (!Number.isFinite(parsed) || parsed === quantity) {
      setQuantityInput(String(quantity));
      return;
    }
    if (parsed <= 0) {
      onRemove();
      return;
    }
    onQuantityChange(parsed);
  };

  return (
    <Box bg="bg" p={{ base: 2, lg: 2.5 }} rounded="l3" borderWidth="1px" borderColor="border">
      <Flex justify="space-between" align="start" mb={1}>
        <Box flex={1}>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold">
            {name}
          </Text>
          <Text fontSize={{ base: "2xs", lg: "xs" }} color="fg.muted">
            {formatVnd(unitPrice)} × {quantity}
          </Text>
          {!editableNote && note && (
            <Text fontSize={{ base: "2xs", lg: "xs" }} color="fg.muted" fontStyle="italic" mt={0.5}>
              Ghi chú: {note}
            </Text>
          )}
        </Box>
        <IconButton
          size="xs"
          variant="ghost"
          colorPalette="red"
          aria-label="Xoá món"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 size={13} />
        </IconButton>
      </Flex>

      {editableNote && (
        <Input
          size="xs"
          placeholder="Ghi chú cho món"
          mb={1}
          value={note ?? ""}
          disabled={disabled}
          onChange={(e) => onNoteChange?.(e.target.value)}
        />
      )}

      <Flex align="center" justify="space-between">
        <Flex align="center" gap={1.5}>
          <IconButton
            size="xs"
            variant="outline"
            aria-label="Giảm số lượng"
            disabled={disabled || quantity <= 1}
            onClick={() => onQuantityChange(quantity - 1)}
          >
            <Minus size={13} />
          </IconButton>
          <Input
            size="xs"
            type="number"
            min={1}
            textAlign="center"
            w="36px"
            px={1}
            disabled={disabled}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            onBlur={commitQuantity}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <IconButton
            size="xs"
            variant="outline"
            aria-label="Tăng số lượng"
            disabled={disabled}
            onClick={() => onQuantityChange(quantity + 1)}
          >
            <Plus size={13} />
          </IconButton>
        </Flex>
        <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="bold">
          {formatVnd(unitPrice * quantity)}
        </Text>
      </Flex>
    </Box>
  );
}
