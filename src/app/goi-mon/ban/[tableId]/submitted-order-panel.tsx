"use client";

import { useMemo, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Box, Button, Flex, IconButton, Stack, Text } from "@chakra-ui/react";
import { X } from "lucide-react";

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
import { formatDiscount, formatVnd, PAYMENT_METHOD_LABEL } from "~/lib/format-order";
import { OrderLineItemCard } from "./order-line-item-card";
import { PromotionPickerDialog } from "./promotion-picker-dialog";
import { showPrintResultToast } from "./print-result-toast";

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
  { value: "cash", label: PAYMENT_METHOD_LABEL.cash! },
  { value: "transfer", label: PAYMENT_METHOD_LABEL.transfer! },
];

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
  // So theo NỘI DUNG order.items (không phải order.id) — panel này giờ luôn
  // nằm trong DOM để giữ vị trí cuộn khi đổi tab (không tự unmount/remount
  // như trước nữa), nên phải tự phát hiện lúc order.items đổi thật (vd vừa
  // gọi thêm món ở tab "Món đang gọi") để đồng bộ lại, không chỉ dựa vào đổi
  // order.id (chỉ đổi khi sang bàn khác).
  const [syncedItems, setSyncedItems] = useState<OrderItems>(order.items);
  // order.getTableOrder giờ poll định kỳ (xem OrderTableView) — nếu nhân
  // viên khác vừa sửa đơn này trong lúc mình đang có thay đổi CHƯA lưu
  // (localItems lệch syncedItems), KHÔNG được âm thầm ghi đè localItems mất
  // thao tác đang dở — chỉ cập nhật syncedItems để không lặp cảnh báo, và
  // bật banner để người dùng tự chọn tải lại bản mới nhất.
  const [hasConflict, setHasConflict] = useState(false);
  if (!itemsEqual(order.items, syncedItems)) {
    if (!itemsEqual(localItems, syncedItems)) {
      setSyncedItems(order.items);
      setHasConflict(true);
    } else {
      setLocalItems(order.items);
      setSyncedItems(order.items);
    }
  }
  const isDirty = useMemo(() => !itemsEqual(localItems, order.items), [localItems, order.items]);

  const handleReloadFromServer = () => {
    setLocalItems(order.items);
    setHasConflict(false);
  };

  const updateItemsMutation = api.order.updateItems.useMutation({
    onSuccess: (data) => {
      showPrintResultToast(data.printResult, { label: "phiếu bếp", silentOnSuccess: true });
      setHasConflict(false);
      // Đánh dấu NGAY những gì mình vừa lưu là bản đã đồng bộ — nếu không,
      // lúc invalidate() bên dưới refetch xong sẽ mang về đúng order.items
      // mới (khớp với localItems vừa lưu) nhưng so với syncedItems CŨ (từ
      // trước khi sửa) sẽ thấy lệch, code lại tưởng nhầm là người khác vừa
      // sửa và bật banner xung đột — dù chính mình là người vừa lưu.
      setSyncedItems(localItems);
      invalidate();
    },
    onError: (error) =>
      toaster.create({ title: "Không lưu được thay đổi", description: error.message, type: "error" }),
  });
  const confirmPayment = api.order.confirmPayment.useMutation();
  const cancelOrder = api.order.cancel.useMutation({
    onError: (error) => toaster.create({ title: "Không huỷ được đơn", description: error.message, type: "error" }),
  });
  const applyPromotion = api.order.applyPromotion.useMutation({
    onError: (error) => toaster.create({ title: "Không áp dụng được khuyến mãi", description: error.message, type: "error" }),
    onSuccess: () => {
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

  const isBusy =
    updateItemsMutation.isPending || applyPromotion.isPending || removePromotion.isPending;

  const { subtotal, discountAmount, payableAmount } = computeTotals(localItems, order.promotion);

  const handleDiscardChanges = () => {
    setLocalItems(order.items);
    setHasConflict(false);
  };

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
      await confirmPayment.mutateAsync({ orderId: order.id, paymentMethod });
      setPaymentOpen(false);
      // Ở lại ngay tại bàn thay vì điều hướng về sơ đồ tầng — order vừa "paid"
      // nên getTableOrder trả về null, OrderTableView tự chuyển tab về "Chọn
      // món" (xem useEffect ở đó), không cần push route gây giật màn hình.
      invalidate();
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
          setCancelConfirmOpen(false);
          router.push("/goi-mon");
        },
      },
    );
  };

  return (
    <Flex direction="column" flex={1} minH={0}>
      {hasConflict && (
        <Flex
          flexShrink={0}
          align="center"
          justify="space-between"
          gap={2}
          bg="orange.subtle"
          borderBottomWidth="1px"
          borderColor="border"
          px={{ base: 2, lg: 3 }}
          py={2}
        >
          <Text fontSize="xs" color="orange.fg">
            Đơn vừa được cập nhật ở nơi khác — tải lại trước khi lưu.
          </Text>
          <Button size="xs" variant="outline" flexShrink={0} onClick={handleReloadFromServer}>
            Tải lại
          </Button>
        </Flex>
      )}

      <Box flex={1} overflowY="auto" p={{ base: 2, lg: 3 }}>
        {localItems.length === 0 ? (
          <Flex flex={1} align="center" justify="center" py={10}>
            <EmptyState
              title="Đã trả hết món"
              description="Bàn vẫn đang phục vụ — gọi thêm món hoặc bấm Huỷ đơn nếu không dùng nữa."
            />
          </Flex>
        ) : (
          <Stack gap={1.5}>
            {localItems.map((item) => (
              <OrderLineItemCard
                key={item.id!}
                name={item.itemName}
                unitPrice={item.unitPrice}
                quantity={item.quantity}
                note={item.note}
                editableNote={false}
                disabled={isBusy}
                onQuantityChange={(quantity) =>
                  setLocalItems((items) => items.map((i) => (i.id === item.id ? { ...i, quantity } : i)))
                }
                onRemove={() => setLocalItems((items) => items.filter((i) => i.id !== item.id))}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Box
        flexShrink={0}
        bg="bg"
        borderTopWidth="1px"
        borderColor="border"
        px={{ base: 2.5, lg: 3 }}
        pt={{ base: 2.5, lg: 3 }}
        // An toàn cho thiết bị có thanh cử chỉ/notch dưới (viewportFit "cover"
        // ở layout.tsx bật env(safe-area-inset-bottom)) — cộng thêm khoảng đệm
        // cố định để nút bấm không dính sát mép màn hình dù có safe-area hay
        // không (Android thường trả về 0 cho biến này).
        pb={{ base: "calc(0.625rem + env(safe-area-inset-bottom))", lg: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <Flex justify="space-between" align="center" mb={1}>
          <Text fontSize={{ base: "xs", lg: "sm" }} color="fg.muted">
            Tạm tính
          </Text>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold">
            {formatVnd(subtotal)}
          </Text>
        </Flex>

        {localItems.length > 0 && (order.promotion ? (
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
                size={{ base: "xs", lg: "sm" }}
                variant="ghost"
                disabled={isBusy}
                onClick={() => setPromotionPickerOpen(true)}
              >
                Đổi
              </Button>
              <IconButton
                size={{ base: "xs", lg: "sm" }}
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
              size={{ base: "xs", lg: "sm" }}
              variant="outline"
              disabled={isBusy}
              onClick={() => setPromotionPickerOpen(true)}
            >
              Thêm
            </Button>
          </Flex>
        ))}

        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold">
            Cần thanh toán
          </Text>
          <Text fontSize={{ base: "md", lg: "lg" }} fontWeight="bold" color="blue.fg">
            {formatVnd(payableAmount)}
          </Text>
        </Flex>
        <Flex gap={2}>
          <Button
            flex={1}
            variant="outline"
            colorPalette={isDirty ? undefined : "red"}
            size={{ base: "sm", lg: "md" }}
            disabled={isBusy}
            onClick={() => (isDirty ? handleDiscardChanges() : setCancelConfirmOpen(true))}
          >
            {isDirty ? "Huỷ thay đổi" : "Huỷ đơn"}
          </Button>
          <Button
            flex={1}
            colorPalette="blue"
            size={{ base: "sm", lg: "md" }}
            loading={updateItemsMutation.isPending}
            // Đơn đã lưu mà 0 món thì chưa có gì để thanh toán — "Xác nhận"
            // (lưu thay đổi, kể cả trả hết món) vẫn luôn bấm được. Thanh toán
            // không phụ thuộc đã in bill hay chưa — 2 hành động độc lập.
            disabled={!isDirty && localItems.length === 0}
            onClick={() => (isDirty ? handleConfirmChanges() : handleOpenPayment())}
          >
            {isDirty ? "Xác nhận" : "Thanh toán"}
          </Button>
        </Flex>
      </Box>

      <DialogRoot open={paymentOpen} onOpenChange={(e) => setPaymentOpen(e.open)}>
        <DialogContent maxW={{ base: "calc(100vw - 24px)", md: "400px", lg: "480px" }} mx="auto">
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
            <Button size="md" variant="outline" onClick={() => setPaymentOpen(false)}>
              Huỷ
            </Button>
            <Button
              size="md"
              colorPalette="blue"
              onClick={handleConfirmPayment}
              loading={confirmPayment.isPending}
            >
              Xác nhận thanh toán
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot role="alertdialog" open={cancelConfirmOpen} onOpenChange={(e) => setCancelConfirmOpen(e.open)}>
        <DialogContent maxW={{ base: "calc(100vw - 24px)", md: "360px", lg: "420px" }} mx="auto">
          <DialogHeader>
            <DialogTitle>Huỷ đơn hàng của bàn này?</DialogTitle>
          </DialogHeader>
          <DialogBody>Toàn bộ món đã gọi sẽ bị huỷ. Hành động này không thể hoàn tác.</DialogBody>
          <DialogFooter>
            <Button size="md" variant="outline" onClick={() => setCancelConfirmOpen(false)}>
              Đóng
            </Button>
            <Button size="md" colorPalette="red" onClick={handleCancelOrder} loading={cancelOrder.isPending}>
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
