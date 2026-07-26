"use client";

import { useEffect, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Badge, Box, Button, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { Minus, Plus } from "lucide-react";

import { EmptyState } from "~/components/ui/empty-state";
import { api } from "~/trpc/react";
import type { OrderItemEventEntry } from "~/modules/order/domain/order.repository";

const PAGE_SIZE = 20;
// Gõ xong đợi 300ms rồi mới gọi server — tránh bắn query mỗi lần gõ 1 ký tự.
const SEARCH_DEBOUNCE_MS = 300;

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function OrderItemEventCard({ entry }: { entry: OrderItemEventEntry }) {
  const isRemoved = entry.eventType === "items_removed";

  return (
    <Box bg="bg" p={{ base: 2, lg: 3 }} rounded="l2" borderWidth="1px" borderColor="border">
      <Flex align="center" justify="space-between" mb={2}>
        <Box>
          <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="semibold">
            {entry.tableName}
          </Text>
          <Text fontSize="2xs" color="fg.muted">
            {entry.actorName} · {formatDateTime(entry.createdAt)}
          </Text>
        </Box>
        <Badge size="sm" colorPalette={isRemoved ? "red" : "green"} variant="subtle">
          {isRemoved ? <Minus size={12} /> : <Plus size={12} />}
          {isRemoved ? "Đã trả món" : "Gọi món"}
        </Badge>
      </Flex>

      <Stack gap={0.5} pt={2} borderTopWidth="1px" borderColor="border">
        {entry.items.map((item, index) => (
          <Flex key={index} justify="space-between">
            <Text fontSize="xs" color={isRemoved ? "fg.error" : undefined}>
              {item.itemName}
            </Text>
            <Text fontSize="xs" color={isRemoved ? "fg.error" : "fg.muted"}>
              {isRemoved ? "-" : "×"} {item.quantity}
            </Text>
          </Flex>
        ))}
      </Stack>
    </Box>
  );
}

export function OrderItemEventsList() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<OrderItemEventEntry[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Tìm kiếm chạy ở server (unaccent trên items_summary) — không giới hạn
  // theo dữ liệu đã tải sẵn ở client.
  const { data, isFetching } = api.order.listOrderItemEvents.useQuery(
    { page, pageSize: PAGE_SIZE, search: search || undefined },
    { placeholderData: keepPreviousData },
  );

  useEffect(() => {
    if (!data) return;
    // Phân trang theo offset — nếu có event mới chen vào giữa lúc đang tải
    // thêm trang, trang sau có thể trả lại row đã có ở trang trước. Khử
    // trùng theo id khi gộp để tránh hiện 2 lần cùng 1 event.
    setEntries((prev) => {
      if (page === 1) return data.items;
      const existingIds = new Set(prev.map((e) => e.id));
      return [...prev, ...data.items.filter((e) => !existingIds.has(e.id))];
    });
  }, [data, page]);

  const hasMore = data ? entries.length < data.total : false;

  return (
    <Stack gap={{ base: 1.5, lg: 2 }}>
      <Input
        placeholder="Tìm món"
        size={{ base: "xs", lg: "sm" }}
        bg="bg"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />

      {entries.length === 0 && !isFetching ? (
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
