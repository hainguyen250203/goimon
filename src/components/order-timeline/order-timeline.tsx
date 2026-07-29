import { Box, Circle, Flex, Stack, Text } from "@chakra-ui/react";
import { ArrowDownLeft, ArrowUpRight, Ban, ChefHat, CreditCard, Minus, Move, Percent, X } from "lucide-react";

import type { OrderTimelineEvent } from "~/modules/order/domain/order.repository";
import { formatDateTime, formatVnd, PAYMENT_METHOD_LABEL } from "~/lib/format-order";

type Accent = "green" | "red" | "gray";

/**
 * Diễn giải payload JSON thô thành nhãn + chi tiết tiếng Việt theo eventType
 * — UI tự biết cách đọc từng loại event, repository chỉ trả payload thô.
 * Dùng chung cho cả trang lịch sử full-page (/goi-mon) lẫn dialog lịch sử ở
 * admin (/quan-ly/don-hang) — tránh lặp lại cách diễn giải 7 event_type.
 *
 * Màu chỉ dùng 3 tông (xanh = việc tích cực/hoàn tất, đỏ = việc bị đảo
 * ngược/huỷ, xám = chỉnh sửa thông thường) thay vì 1 màu riêng cho mỗi loại
 * — đủ để phân biệt nhanh mà không sặc sỡ.
 */
function describeEvent(entry: OrderTimelineEvent): {
  icon: React.ReactNode;
  accent: Accent;
  label: string;
  detail: string[];
} {
  const payload = entry.payload as Record<string, unknown> | null;

  switch (entry.eventType) {
    case "items_added": {
      const items =
        (payload?.items as { itemName: string; quantity: number; note?: string | null }[] | undefined) ?? [];
      return {
        icon: <ChefHat size={14} />,
        accent: "green",
        label: "Gọi món",
        detail: items.map((i) => `${i.itemName} ×${i.quantity}${i.note ? ` (${i.note})` : ""}`),
      };
    }
    case "items_removed": {
      const items =
        (payload?.items as { itemName: string; quantity: number; note?: string | null }[] | undefined) ?? [];
      return {
        icon: <Minus size={14} />,
        accent: "red",
        label: "Trả món",
        detail: items.map((i) => `${i.itemName} ×${i.quantity}${i.note ? ` (${i.note})` : ""}`),
      };
    }
    case "items_quantity_updated": {
      const items =
        (payload?.items as
          | { itemName: string; oldQuantity: number; newQuantity: number }[]
          | undefined) ?? [];
      return {
        icon: <ChefHat size={14} />,
        accent: "gray",
        label: "Sửa số lượng",
        detail: items.map((i) => `${i.itemName}: ${i.oldQuantity} → ${i.newQuantity}`),
      };
    }
    case "payment_confirmed": {
      const totalAmount = payload?.totalAmount as number | null;
      const paymentMethod = payload?.paymentMethod as string | undefined;
      return {
        icon: <CreditCard size={14} />,
        accent: "green",
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
        accent: "gray",
        label: "Áp dụng khuyến mãi",
        detail: name ? [name] : [],
      };
    }
    case "promotion_removed": {
      const name = payload?.name as string | undefined;
      return {
        icon: <X size={14} />,
        accent: "gray",
        label: "Gỡ khuyến mãi",
        detail: name ? [name] : [],
      };
    }
    case "order_cancelled":
      return { icon: <Ban size={14} />, accent: "red", label: "Huỷ đơn", detail: [] };
    case "table_changed": {
      const fromTableName = payload?.fromTableName as string | undefined;
      const toTableName = payload?.toTableName as string | undefined;
      return {
        icon: <Move size={14} />,
        accent: "gray",
        label: "Chuyển bàn",
        detail: fromTableName && toTableName ? [`${fromTableName} → ${toTableName}`] : [],
      };
    }
    case "items_transferred_out": {
      const items =
        (payload?.items as { itemName: string; quantity: number; note?: string | null }[] | undefined) ?? [];
      const toTableName = payload?.toTableName as string | undefined;
      return {
        icon: <ArrowUpRight size={14} />,
        accent: "gray",
        label: toTableName ? `Chuyển món sang ${toTableName}` : "Chuyển món sang bàn khác",
        detail: items.map((i) => `${i.itemName} ×${i.quantity}${i.note ? ` (${i.note})` : ""}`),
      };
    }
    case "items_transferred_in": {
      const items =
        (payload?.items as { itemName: string; quantity: number; note?: string | null }[] | undefined) ?? [];
      const fromTableName = payload?.fromTableName as string | undefined;
      return {
        icon: <ArrowDownLeft size={14} />,
        accent: "gray",
        label: fromTableName ? `Nhận món từ ${fromTableName}` : "Nhận món từ bàn khác",
        detail: items.map((i) => `${i.itemName} ×${i.quantity}${i.note ? ` (${i.note})` : ""}`),
      };
    }
    default:
      return { icon: <ChefHat size={14} />, accent: "gray", label: entry.eventType, detail: [] };
  }
}

/**
 * 1 dòng trong timeline — chấm tròn + đường nối dọc để thấy rõ thứ tự thời
 * gian giữa các event (thay vì các card rời rạc, dễ quan sát mạch sự kiện
 * hơn). Chấm nhỏ, không có card bao quanh mỗi dòng để không bị quá cao.
 */
function OrderTimelineRow({ entry, isLast }: { entry: OrderTimelineEvent; isLast: boolean }) {
  const { icon, accent, label, detail } = describeEvent(entry);

  return (
    <Flex gap={3}>
      <Stack align="center" gap={0} flexShrink={0}>
        <Circle size="6" bg={`${accent}.subtle`} color={`${accent}.fg`} flexShrink={0}>
          {icon}
        </Circle>
        {!isLast && <Box w="2px" flex={1} bg="border" my={1} />}
      </Stack>

      <Box flex={1} minW={0} pb={isLast ? 0 : 4}>
        <Flex justify="space-between" align="baseline" gap={2}>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold" lineClamp={1}>
            {label}
          </Text>
          <Text fontSize={{ base: "2xs", lg: "xs" }} color="fg.muted" flexShrink={0}>
            {formatDateTime(entry.createdAt)}
          </Text>
        </Flex>

        <Text fontSize={{ base: "2xs", lg: "xs" }} color="fg.muted" mt={0.5}>
          {entry.actorName}
        </Text>

        {detail.length > 0 && (
          <Stack gap={0.5} mt={1.5}>
            {detail.map((line, i) => (
              <Text key={i} fontSize={{ base: "xs", lg: "sm" }} color="fg.muted">
                {line}
              </Text>
            ))}
          </Stack>
        )}
      </Box>
    </Flex>
  );
}

export function OrderTimeline({ events }: { events: OrderTimelineEvent[] }) {
  return (
    <Stack gap={0}>
      {events.map((entry, index) => (
        <OrderTimelineRow key={entry.id} entry={entry} isLast={index === events.length - 1} />
      ))}
    </Stack>
  );
}
