"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { Box, Button, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { Minus, Plus, Search } from "lucide-react";

import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { formatDateTime } from "~/lib/format-order";
import type { OrderItemEventEntry } from "~/modules/order/domain/order.repository";
import { usePaginationState, useDedupedList } from "../use-paginated-list";

const PAGE_SIZE = 20;

function OrderItemEventCard({ entry }: { entry: OrderItemEventEntry }) {
  const isRemoved = entry.eventType === "items_removed";
  const accent = isRemoved ? "red" : "green";

  return (
    <Box bg="bg" p={{ base: 3, lg: 4 }} rounded="l3" borderWidth="1px" borderColor="border">
      <Flex justify="space-between" align="start" gap={3}>
        <Stack gap={0.5} minW={0}>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold" lineClamp={1}>
            {entry.tableName}
          </Text>
          <Text fontSize={{ base: "2xs", lg: "xs" }} color="fg.muted">
            {entry.actorName} · {formatDateTime(entry.createdAt)}
          </Text>
        </Stack>
        <Flex align="center" gap={1} flexShrink={0} color={`${accent}.fg`}>
          {isRemoved ? <Minus size={14} /> : <Plus size={14} />}
          <Text fontSize={{ base: "2xs", lg: "xs" }} fontWeight="medium">
            {isRemoved ? "Trả món" : "Gọi món"}
          </Text>
        </Flex>
      </Flex>

      <Stack gap={1} mt={3}>
        {entry.items.map((item, index) => (
          <Box key={index}>
            <Flex justify="space-between" gap={3}>
              <Text fontSize={{ base: "xs", lg: "sm" }} color={isRemoved ? "red.fg" : "fg.muted"} lineClamp={1}>
                {item.itemName}
              </Text>
              <Text fontSize={{ base: "xs", lg: "sm" }} color={isRemoved ? "red.fg" : "fg.muted"} flexShrink={0}>
                {isRemoved ? "−" : "×"} {item.quantity}
              </Text>
            </Flex>
            {item.note && (
              <Text fontSize={{ base: "2xs", lg: "xs" }} color="fg.muted" fontStyle="italic" lineClamp={1}>
                Ghi chú: {item.note}
              </Text>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export function OrderItemEventsList() {
  const { search, page, setPage, searchInput, setSearchInput } = usePaginationState();

  // Tìm kiếm chạy ở server (unaccent trên items_summary) — không giới hạn
  // theo dữ liệu đã tải sẵn ở client.
  const { data, isFetching } = api.order.listOrderItemEvents.useQuery(
    { page, pageSize: PAGE_SIZE, search: search || undefined },
    { placeholderData: keepPreviousData },
  );

  const { items: entries, hasMore } = useDedupedList(data, page);
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
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </Box>

      {isInitialLoading ? (
        <Stack gap={3}>
          <Skeleton h="88px" rounded="l3" />
          <Skeleton h="88px" rounded="l3" />
          <Skeleton h="88px" rounded="l3" />
        </Stack>
      ) : entries.length === 0 ? (
        <Flex flex={1} align="center" justify="center" py={10}>
          <EmptyState title={search ? "Không tìm thấy món" : "Chưa có lịch sử gọi món"} />
        </Flex>
      ) : (
        <>
          {entries.map((entry) => (
            <OrderItemEventCard key={entry.id} entry={entry} />
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
