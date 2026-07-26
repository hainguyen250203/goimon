import { Badge, Box, Flex, Stack, Text } from "@chakra-ui/react";
import { Ban, ChefHat, CreditCard, Minus, Percent, X } from "lucide-react";

import type { OrderTimelineEvent } from "~/modules/order/domain/order.repository";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

/**
 * Diễn giải payload JSON thô thành nhãn + chi tiết tiếng Việt theo eventType
 * — UI tự biết cách đọc từng loại event, repository chỉ trả payload thô.
 * Dùng chung cho cả trang lịch sử full-page (/goi-mon) lẫn dialog lịch sử ở
 * admin (/quan-ly/don-hang) — tránh lặp lại cách diễn giải 7 event_type.
 */
function describeEvent(entry: OrderTimelineEvent): {
  icon: React.ReactNode;
  color: string;
  label: string;
  detail: string[];
} {
  const payload = entry.payload as Record<string, unknown> | null;

  switch (entry.eventType) {
    case "items_added": {
      const items = (payload?.items as { itemName: string; quantity: number }[] | undefined) ?? [];
      return {
        icon: <ChefHat size={14} />,
        color: "green",
        label: "Gọi món",
        detail: items.map((i) => `${i.itemName} ×${i.quantity}`),
      };
    }
    case "items_removed": {
      const items = (payload?.items as { itemName: string; quantity: number }[] | undefined) ?? [];
      return {
        icon: <Minus size={14} />,
        color: "red",
        label: "Trả món",
        detail: items.map((i) => `${i.itemName} ×${i.quantity}`),
      };
    }
    case "items_quantity_updated": {
      const items =
        (payload?.items as
          | { itemName: string; oldQuantity: number; newQuantity: number }[]
          | undefined) ?? [];
      return {
        icon: <ChefHat size={14} />,
        color: "blue",
        label: "Sửa số lượng",
        detail: items.map((i) => `${i.itemName}: ${i.oldQuantity} → ${i.newQuantity}`),
      };
    }
    case "payment_confirmed": {
      const totalAmount = payload?.totalAmount as number | null;
      const paymentMethod = payload?.paymentMethod as string | undefined;
      return {
        icon: <CreditCard size={14} />,
        color: "green",
        label: "Xác nhận thanh toán",
        detail: [
          paymentMethod ? PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod : null,
          totalAmount != null ? `Tổng: ${formatVnd(totalAmount)}` : null,
        ].filter((line): line is string => !!line),
      };
    }
    case "promotion_applied": {
      const name = payload?.name as string | undefined;
      return {
        icon: <Percent size={14} />,
        color: "orange",
        label: "Áp dụng khuyến mãi",
        detail: name ? [name] : [],
      };
    }
    case "promotion_removed": {
      const name = payload?.name as string | undefined;
      return {
        icon: <X size={14} />,
        color: "gray",
        label: "Gỡ khuyến mãi",
        detail: name ? [name] : [],
      };
    }
    case "order_cancelled":
      return { icon: <Ban size={14} />, color: "red", label: "Huỷ đơn", detail: [] };
    default:
      return { icon: <ChefHat size={14} />, color: "gray", label: entry.eventType, detail: [] };
  }
}

export function TimelineEventCard({ entry }: { entry: OrderTimelineEvent }) {
  const { icon, color, label, detail } = describeEvent(entry);

  return (
    <Box bg="bg" p={{ base: 2, lg: 3 }} rounded="l2" borderWidth="1px" borderColor="border">
      <Flex align="center" justify="space-between" mb={detail.length > 0 ? 2 : 0}>
        <Badge size="sm" colorPalette={color} variant="subtle">
          {icon}
          {label}
        </Badge>
        <Text fontSize="2xs" color="fg.muted">
          {entry.actorName} · {formatDateTime(entry.createdAt)}
        </Text>
      </Flex>

      {detail.length > 0 && (
        <Stack gap={0.5} pt={2} borderTopWidth="1px" borderColor="border">
          {detail.map((line, index) => (
            <Text key={index} fontSize="xs" color="fg.muted">
              {line}
            </Text>
          ))}
        </Stack>
      )}
    </Box>
  );
}
