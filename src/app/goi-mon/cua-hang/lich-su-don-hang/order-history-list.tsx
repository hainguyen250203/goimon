"use client";

import { useEffect, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Box, Button, Flex, Input, Stack, Text } from "@chakra-ui/react";

import { StatusDot } from "~/components/ui/status-dot";
import { EmptyState } from "~/components/ui/empty-state";
import { api } from "~/trpc/react";
import type { OrderListItem, OrderStatus } from "~/modules/order/domain/order-list-item.entity";

const PAGE_SIZE = 20;
// Gõ xong đợi 300ms rồi mới gọi server — tránh bắn query mỗi lần gõ 1 ký tự.
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_LABEL: Record<OrderStatus, string> = {
  open: "Đang mở",
  printed: "Đã in bill",
  paid: "Đã thanh toán",
  cancelled: "Đã huỷ",
};

const STATUS_DOT_COLOR: Record<OrderStatus, string> = {
  open: "gray.400",
  printed: "blue.500",
  paid: "green.500",
  cancelled: "red.500",
};

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

function OrderHistoryCard({ order }: { order: OrderListItem }) {
  return (
    <Box bg="bg" p={{ base: 2, lg: 3 }} rounded="l2" borderWidth="1px" borderColor="border">
      <Flex justify="space-between" align="start" mb={2}>
        <Box>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold">
            {order.tableName} · {order.areaName}
          </Text>
          <Text fontSize="2xs" color="fg.muted">
            {order.createdByName} · {formatDateTime(order.createdAt)}
          </Text>
          {order.promotionName && (
            <Text fontSize="2xs" color="fg.muted" fontStyle="italic">
              Khuyến mãi: {order.promotionName}
            </Text>
          )}
        </Box>
        <StatusDot color={STATUS_DOT_COLOR[order.status]}>{STATUS_LABEL[order.status]}</StatusDot>
      </Flex>

      {order.items.length > 0 && (
        <Stack gap={0.5} py={2} borderTopWidth="1px" borderColor="border">
          {order.items.map((item) => (
            <Flex key={item.id} justify="space-between">
              <Text fontSize="xs">{item.itemName}</Text>
              <Text fontSize="xs" color="fg.muted">
                × {item.quantity}
              </Text>
            </Flex>
          ))}
        </Stack>
      )}

      <Flex
        justify="space-between"
        align="center"
        pt={2}
        borderTopWidth="1px"
        borderColor="border"
      >
        <Text fontSize="2xs" color="fg.muted">
          {order.paymentMethod ? PAYMENT_METHOD_LABEL[order.paymentMethod] : "—"}
        </Text>
        <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="bold" color="blue.fg">
          {order.totalAmount != null ? formatVnd(order.totalAmount) : "—"}
        </Text>
      </Flex>
    </Box>
  );
}

export function OrderHistoryList({ enableSearch = false }: { enableSearch?: boolean }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OrderListItem[]>([]);

  useEffect(() => {
    if (!enableSearch) return;
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, enableSearch]);

  const { data, isFetching } = api.order.list.useQuery(
    { page, pageSize: PAGE_SIZE, search: search || undefined },
    { placeholderData: keepPreviousData },
  );

  useEffect(() => {
    if (!data) return;
    // Phân trang theo offset — nếu có đơn mới chen vào giữa lúc đang tải
    // thêm trang, trang sau có thể trả lại row đã có ở trang trước. Khử
    // trùng theo id khi gộp để tránh hiện 2 lần cùng 1 đơn.
    setItems((prev) => {
      if (page === 1) return data.items;
      const existingIds = new Set(prev.map((o) => o.id));
      return [...prev, ...data.items.filter((o) => !existingIds.has(o.id))];
    });
  }, [data, page]);

  const hasMore = data ? items.length < data.total : false;

  return (
    <Stack gap={{ base: 1.5, lg: 2 }}>
      {enableSearch && (
        <Input
          placeholder="Tìm món"
          size={{ base: "xs", lg: "sm" }}
          bg="bg"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      )}

      {items.length === 0 && !isFetching ? (
        <Flex flex={1} align="center" justify="center" py={10}>
          <EmptyState title={enableSearch && search ? "Không tìm thấy món" : "Chưa có đơn hàng nào"} />
        </Flex>
      ) : (
        <>
          {items.map((order) => (
            <OrderHistoryCard key={order.id} order={order} />
          ))}

          {hasMore && (
            <Button
              size="sm"
              variant="outline"
              loading={isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Xem thêm
            </Button>
          )}
        </>
      )}
    </Stack>
  );
}
