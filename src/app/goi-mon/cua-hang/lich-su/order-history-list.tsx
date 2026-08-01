"use client";

import { memo } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Box, Button, Flex, IconButton, Input, Stack, Text } from "@chakra-ui/react";
import { Search, X } from "lucide-react";

import { StatusDot } from "~/components/ui/status-dot";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { formatDateTime, formatVnd, PAYMENT_METHOD_LABEL, STATUS_DOT_COLOR, STATUS_LABEL } from "~/lib/format-order";
import type { OrderListItem } from "~/modules/order/domain/order-list-item.entity";
import { usePaginationState, useDedupedList } from "../use-paginated-list";

const PAGE_SIZE = 20;

// order chỉ đổi reference khi data thật sự đổi (useDedupedList chỉ setItems
// khi query trả về data mới) — memo tránh re-render toàn bộ danh sách card
// mỗi lần gõ ô tìm kiếm (searchInput đổi mỗi keystroke nhưng items thì không).
const OrderHistoryCard = memo(function OrderHistoryCard({ order }: { order: OrderListItem }) {
  return (
    <Box bg="bg" p={{ base: 3, lg: 4 }} rounded="l3" borderWidth="1px" borderColor="border">
      <Flex justify="space-between" align="start" gap={3}>
        <Stack gap={0.5} minW={0}>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold" lineClamp={1}>
            {order.tableName} · {order.areaName}
          </Text>
          <Text fontSize={{ base: "2xs", lg: "xs" }} color="fg.muted">
            {order.createdByName} · {formatDateTime(order.createdAt)}
          </Text>
        </Stack>
        <StatusDot color={STATUS_DOT_COLOR[order.status]}>{STATUS_LABEL[order.status]}</StatusDot>
      </Flex>

      {order.promotionName && (
        <Text fontSize={{ base: "2xs", lg: "xs" }} color="green.fg" mt={2}>
          Khuyến mãi · {order.promotionName}
        </Text>
      )}

      {order.items.length > 0 && (
        <Stack gap={1} mt={3}>
          {order.items.map((item) => (
            <Flex key={item.id} justify="space-between" gap={3}>
              <Text fontSize={{ base: "xs", lg: "sm" }} color="fg.muted" lineClamp={1}>
                {item.itemName}
              </Text>
              <Text fontSize={{ base: "xs", lg: "sm" }} color="fg.muted" flexShrink={0}>
                × {item.quantity}
              </Text>
            </Flex>
          ))}
        </Stack>
      )}

      <Flex
        justify="space-between"
        align="center"
        mt={3}
        pt={3}
        borderTopWidth="1px"
        borderColor="border"
      >
        <Text fontSize={{ base: "2xs", lg: "xs" }} color="fg.muted">
          {order.paymentMethod ? PAYMENT_METHOD_LABEL[order.paymentMethod] : "Chưa thanh toán"}
        </Text>
        <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="bold">
          {order.totalAmount != null
            ? formatVnd(order.totalAmount)
            : formatVnd(order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}
        </Text>
      </Flex>
    </Box>
  );
});

export function OrderHistoryList() {
  const { search, page, setPage, searchInput, setSearchInput } = usePaginationState();

  const { data, isFetching } = api.order.list.useQuery(
    { page, pageSize: PAGE_SIZE, search: search || undefined, currentShiftOnly: true },
    { placeholderData: keepPreviousData },
  );

  const { items, hasMore } = useDedupedList(data, page);
  const isInitialLoading = !data && isFetching;

  return (
    <Stack gap={3}>
      <Box position="relative">
        <Search
          size={15}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--chakra-colors-fg-muted)",
            pointerEvents: "none",
          }}
        />
        <Input
          placeholder="Tìm món"
          size="sm"
          bg="bg"
          pl={8}
          pr={searchInput ? 8 : undefined}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <IconButton
            aria-label="Xoá tìm kiếm"
            size="xs"
            variant="ghost"
            position="absolute"
            right={1}
            top="50%"
            transform="translateY(-50%)"
            onClick={() => setSearchInput("")}
          >
            <X size={14} />
          </IconButton>
        )}
      </Box>

      {isInitialLoading ? (
        <Stack gap={3}>
          <Skeleton h="88px" rounded="l3" />
          <Skeleton h="88px" rounded="l3" />
          <Skeleton h="88px" rounded="l3" />
        </Stack>
      ) : items.length === 0 ? (
        <Flex flex={1} align="center" justify="center" py={10}>
          <EmptyState title={search ? "Không tìm thấy món" : "Chưa có đơn hàng nào"} />
        </Flex>
      ) : (
        <>
          {items.map((order) => (
            <OrderHistoryCard key={order.id} order={order} />
          ))}

          <Text fontSize="xs" color="fg.muted" textAlign="center">
            {items.length}/{data?.total ?? items.length} kết quả
          </Text>

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
