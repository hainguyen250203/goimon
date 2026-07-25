"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Flex, IconButton, Input, Stack, Text } from "@chakra-ui/react";
import { Minus, Plus, Trash2, X } from "lucide-react";

import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/empty-state";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { PromotionPickerDialog } from "./promotion-picker-dialog";

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatDiscount(promotion: { discountType: "percent" | "fixed"; discountValue: number }) {
  return promotion.discountType === "percent"
    ? `${promotion.discountValue}%`
    : formatVnd(promotion.discountValue);
}

type Order = NonNullable<RouterOutputs["order"]["getTableOrder"]>;
type OrderItems = Order["items"];

/** Tính lại subtotal/discount/payable từ danh sách món đang sửa cục bộ (chưa lưu). */
function computeTotals(items: OrderItems, promotion: Order["promotion"]) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  let discountAmount = 0;
  if (promotion) {
    discountAmount =
      promotion.discountType === "percent"
        ? Math.min(Math.round((subtotal * promotion.discountValue) / 100), subtotal)
        : Math.min(promotion.discountValue, subtotal);
  }
  return { subtotal, discountAmount, payableAmount: Math.max(subtotal - discountAmount, 0) };
}

function itemsEqual(a: OrderItems, b: OrderItems) {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((item) => [item.id, item]));
  return a.every((item) => byId.get(item.id)?.quantity === item.quantity);
}

const PAYMENT_METHODS: { value: "cash" | "transfer"; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
];

function OrderItemRow({
  item,
  isBusy,
  onQuantityChange,
  onRemove,
}: {
  item: OrderItems[number];
  isBusy: boolean;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
}) {
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));

  // Đồng bộ lại khi số lượng đổi từ nơi khác (nút +/-) — effect chỉ chạy khi
  // item.quantity thực sự đổi, không đè lúc đang gõ dở.
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
      onRemove(item.id!);
      return;
    }
    onQuantityChange(item.id!, parsed);
  };

  return (
    <Box bg="bg" p={{ base: 2, lg: 3 }} rounded="l2" borderWidth="1px" borderColor="border">
      <Flex justify="space-between" align="start" mb={{ base: 1.5, lg: 2 }}>
        <Box flex={1}>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold">
            {item.itemName}
          </Text>
          <Text fontSize="xs" color="blue.fg">
            {formatVnd(item.unitPrice)} × {item.quantity}
          </Text>
          {item.note && (
            <Text fontSize="2xs" color="fg.muted" fontStyle="italic" mt={1}>
              Ghi chú: {item.note}
            </Text>
          )}
        </Box>
        <IconButton
          size={{ base: "xs", lg: "sm" }}
          variant="ghost"
          colorPalette="red"
          aria-label="Xoá món"
          disabled={isBusy}
          onClick={() => onRemove(item.id!)}
        >
          <Trash2 size={14} />
        </IconButton>
      </Flex>

      <Flex align="center" justify="space-between">
        <Flex align="center" gap={{ base: 1.5, lg: 2 }}>
          <IconButton
            size={{ base: "xs", lg: "sm" }}
            variant="outline"
            aria-label="Giảm số lượng"
            disabled={isBusy || item.quantity <= 1}
            onClick={() => onQuantityChange(item.id!, item.quantity - 1)}
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
            disabled={isBusy}
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
            disabled={isBusy}
            onClick={() => onQuantityChange(item.id!, item.quantity + 1)}
          >
            <Plus size={13} />
          </IconButton>
        </Flex>
        <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="bold" color="blue.fg">
          {formatVnd(item.unitPrice * item.quantity)}
        </Text>
      </Flex>
    </Box>
  );
}

export function SubmittedOrderPanel({ tableId, order }: { tableId: number; order: Order }) {
  const router = useRouter();
  const utils = api.useUtils();

  const invalidate = () => {
    void utils.order.getTableOrder.invalidate({ tableId });
    void utils.order.listTablesForOrdering.invalidate();
  };

  // Sửa số lượng/xoá món chỉ đổi state cục bộ (không gọi mạng) — chỉ gửi lên
  // server gộp 1 lần khi bấm "Xác nhận". Mượt hơn hẳn optimistic update vì
  // không có round-trip nào trong lúc đang thao tác.
  const [localItems, setLocalItems] = useState<OrderItems>(order.items);
  const [syncedOrderId, setSyncedOrderId] = useState(order.id);
  if (order.id !== syncedOrderId) {
    // Đổi sang đơn khác (đổi bàn) — reset state sửa dở, tránh áp nhầm đơn.
    setLocalItems(order.items);
    setSyncedOrderId(order.id);
  }
  const isDirty = useMemo(() => !itemsEqual(localItems, order.items), [localItems, order.items]);

  const updateItemsMutation = api.order.updateItems.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã lưu thay đổi", type: "success" });
      invalidate();
    },
    onError: (error) =>
      toaster.create({ title: "Không lưu được thay đổi", description: error.message, type: "error" }),
  });
  const printBill = api.order.printBill.useMutation({
    onError: (error) => toaster.create({ title: "Không in được bill", description: error.message, type: "error" }),
  });
  const confirmPayment = api.order.confirmPayment.useMutation();
  const cancelOrder = api.order.cancel.useMutation({
    onError: (error) => toaster.create({ title: "Không huỷ được đơn", description: error.message, type: "error" }),
  });
  const applyPromotion = api.order.applyPromotion.useMutation({
    onError: (error) => toaster.create({ title: "Không áp dụng được khuyến mãi", description: error.message, type: "error" }),
    onSuccess: () => {
      toaster.create({ title: "Đã áp dụng khuyến mãi", type: "success" });
      setPromotionPickerOpen(false);
      invalidate();
    },
  });
  const removePromotion = api.order.removePromotion.useMutation({
    onError: (error) => toaster.create({ title: "Không gỡ được khuyến mãi", description: error.message, type: "error" }),
    onSuccess: invalidate,
  });

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [promotionPickerOpen, setPromotionPickerOpen] = useState(false);

  if (order.items.length === 0) {
    return (
      <Flex flex={1} align="center" justify="center">
        <EmptyState title="Chưa có món nào" />
      </Flex>
    );
  }

  const isBusy =
    updateItemsMutation.isPending || printBill.isPending || applyPromotion.isPending || removePromotion.isPending;

  const { subtotal, discountAmount, payableAmount } = computeTotals(localItems, order.promotion);

  const handleDiscardChanges = () => setLocalItems(order.items);

  const handleConfirmChanges = () => {
    const removedItemIds = order.items
      .filter((item) => !localItems.some((local) => local.id === item.id))
      .map((item) => item.id!);
    const changes = localItems
      .filter((item) => {
        const original = order.items.find((oi) => oi.id === item.id);
        return original && original.quantity !== item.quantity;
      })
      .map((item) => ({ itemId: item.id!, quantity: item.quantity }));

    updateItemsMutation.mutate({ orderId: order.id, changes, removedItemIds });
  };

  const handleOpenPayment = () => {
    setPaymentMethod("cash");
    setPaymentOpen(true);
  };

  const handleConfirmPayment = async () => {
    try {
      // In bill trước nếu đơn đang "open" — điều kiện bắt buộc để thanh toán
      // trong state machine (xem CLAUDE.md), chưa gọi máy in thật.
      if (order.status === "open") {
        await printBill.mutateAsync({ orderId: order.id });
      }
      await confirmPayment.mutateAsync({ orderId: order.id, paymentMethod });
      toaster.create({ title: "Đã xác nhận thanh toán", type: "success" });
      setPaymentOpen(false);
      invalidate();
      router.push("/goi-mon");
    } catch (error) {
      toaster.create({
        title: "Không thể xác nhận thanh toán",
        description: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    }
  };

  const handleCancelOrder = () => {
    cancelOrder.mutate(
      { orderId: order.id },
      {
        onSuccess: () => {
          toaster.create({ title: "Đã huỷ đơn", type: "success" });
          setCancelConfirmOpen(false);
          router.push("/goi-mon");
        },
      },
    );
  };

  return (
    <Flex direction="column" flex={1} minH={0}>
      <Box flex={1} overflowY="auto" p={{ base: 2, lg: 3 }}>
        <Stack gap={{ base: 1.5, lg: 2 }}>
          {localItems.map((item) => (
            <OrderItemRow
              key={item.id!}
              item={item}
              isBusy={isBusy}
              onQuantityChange={(itemId, quantity) =>
                setLocalItems((items) => items.map((i) => (i.id === itemId ? { ...i, quantity } : i)))
              }
              onRemove={(itemId) => setLocalItems((items) => items.filter((i) => i.id !== itemId))}
            />
          ))}
        </Stack>
      </Box>

      <Box flexShrink={0} bg="bg" borderTopWidth="1px" borderColor="border" p={{ base: 3, lg: 4 }}>
        <Flex justify="space-between" align="center" mb={1}>
          <Text fontSize={{ base: "xs", lg: "sm" }} color="fg.muted">
            Tạm tính
          </Text>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold">
            {formatVnd(subtotal)}
          </Text>
        </Flex>

        {order.promotion ? (
          <Flex
            justify="space-between"
            align="center"
            mb={1}
            bg="green.subtle"
            px={{ base: 2, lg: 2.5 }}
            py={{ base: 1.5, lg: 2 }}
            rounded="l2"
          >
            <Box>
              <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold" color="green.fg">
                {order.promotion.name}
              </Text>
              <Text fontSize="2xs" color="green.fg">
                Giảm {formatDiscount(order.promotion)} · -{formatVnd(discountAmount)}
              </Text>
            </Box>
            <Flex align="center" gap={1}>
              <Button
                size="xs"
                variant="ghost"
                disabled={isBusy}
                onClick={() => setPromotionPickerOpen(true)}
              >
                Đổi
              </Button>
              <IconButton
                size="xs"
                variant="ghost"
                colorPalette="red"
                aria-label="Gỡ khuyến mãi"
                disabled={isBusy}
                onClick={() => removePromotion.mutate({ orderId: order.id })}
              >
                <X size={14} />
              </IconButton>
            </Flex>
          </Flex>
        ) : (
          <Flex justify="space-between" align="center" mb={1}>
            <Text fontSize={{ base: "xs", lg: "sm" }} color="fg.muted">
              Khuyến mãi
            </Text>
            <Button
              size="xs"
              variant="outline"
              disabled={isBusy}
              onClick={() => setPromotionPickerOpen(true)}
            >
              Thêm
            </Button>
          </Flex>
        )}

        <Flex justify="space-between" align="center" mb={{ base: 2, lg: 3 }}>
          <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="semibold">
            Cần thanh toán
          </Text>
          <Text fontSize={{ base: "lg", lg: "xl" }} fontWeight="bold" color="blue.fg">
            {formatVnd(payableAmount)}
          </Text>
        </Flex>
        <Flex gap={{ base: 2, lg: 3 }}>
          <Button
            flex={1}
            variant="outline"
            colorPalette="red"
            size={{ base: "md", lg: "lg" }}
            disabled={isBusy}
            onClick={() => (isDirty ? handleDiscardChanges() : setCancelConfirmOpen(true))}
          >
            Huỷ
          </Button>
          <Button
            flex={1}
            colorPalette="blue"
            size={{ base: "md", lg: "lg" }}
            loading={updateItemsMutation.isPending}
            onClick={() => (isDirty ? handleConfirmChanges() : handleOpenPayment())}
          >
            {isDirty ? "Xác nhận" : "Thanh toán"}
          </Button>
        </Flex>
      </Box>

      <DialogRoot open={paymentOpen} onOpenChange={(e) => setPaymentOpen(e.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chọn phương thức thanh toán</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={3} fontSize="sm" color="fg.muted">
              Cần thanh toán: {formatVnd(payableAmount)}
            </Text>
            <Stack gap={2}>
              {PAYMENT_METHODS.map((method) => (
                <Flex
                  key={method.value}
                  as="label"
                  align="center"
                  gap={2}
                  p={2}
                  rounded="l2"
                  borderWidth="1px"
                  borderColor={paymentMethod === method.value ? "blue.solid" : "border"}
                  cursor="pointer"
                >
                  <input
                    type="radio"
                    name="payment-method"
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                  />
                  <Text fontSize="sm">{method.label}</Text>
                </Flex>
              ))}
            </Stack>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Huỷ
            </Button>
            <Button
              colorPalette="blue"
              onClick={handleConfirmPayment}
              loading={printBill.isPending || confirmPayment.isPending}
            >
              Xác nhận thanh toán
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot role="alertdialog" open={cancelConfirmOpen} onOpenChange={(e) => setCancelConfirmOpen(e.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Huỷ đơn hàng của bàn này?</DialogTitle>
          </DialogHeader>
          <DialogBody>Toàn bộ món đã gọi sẽ bị huỷ. Hành động này không thể hoàn tác.</DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelConfirmOpen(false)}>
              Đóng
            </Button>
            <Button colorPalette="red" onClick={handleCancelOrder} loading={cancelOrder.isPending}>
              Huỷ đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <PromotionPickerDialog
        open={promotionPickerOpen}
        onOpenChange={setPromotionPickerOpen}
        isApplying={applyPromotion.isPending}
        onApply={(promotionId) => applyPromotion.mutate({ orderId: order.id, promotionId })}
      />
    </Flex>
  );
}
