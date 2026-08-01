"use client";

import { memo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";

import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { formatDateTime } from "~/lib/format-order";
import { describeEvent } from "~/components/order-timeline/order-timeline";
import type { TableTransferEventEntry } from "~/modules/order/domain/order.repository";
import { useDedupedList } from "../use-paginated-list";

const PAGE_SIZE = 20;

/** Tái dùng describeEvent() của order-timeline.tsx — cùng cách diễn giải icon/màu/nhãn với dialog "Lịch sử đơn", chỉ khác cách trình bày (list nhiều đơn thay vì timeline 1 đơn). memo vì entry chỉ đổi reference khi data thật sự đổi. */
const TableTransferEventCard = memo(function TableTransferEventCard({
  entry,
}: {
  entry: TableTransferEventEntry;
}) {
  const { icon, accent, label, detail } = describeEvent(entry);

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
          {icon}
          <Text fontSize={{ base: "2xs", lg: "xs" }} fontWeight="medium">
            {label}
          </Text>
        </Flex>
      </Flex>

      {detail.length > 0 && (
        <Stack gap={0.5} mt={3}>
          {detail.map((line, i) => (
            <Text key={i} fontSize={{ base: "xs", lg: "sm" }} color="fg.muted">
              {line}
            </Text>
          ))}
        </Stack>
      )}
    </Box>
  );
});

/** Không có ô tìm kiếm (khác 2 tab kia) — "table_changed" không có món để tìm theo tên, giữ tab này đơn giản chỉ phân trang. */
export function TableTransferEventsList() {
  const [page, setPage] = useState(1);

  const { data, isFetching } = api.order.listTableTransferEvents.useQuery(
    { page, pageSize: PAGE_SIZE },
    { placeholderData: keepPreviousData },
  );

  const { items: entries, hasMore } = useDedupedList(data, page);
  const isInitialLoading = !data && isFetching;

  return (
    <Stack gap={3}>
      {isInitialLoading ? (
        <Stack gap={3}>
          <Skeleton h="88px" rounded="l3" />
          <Skeleton h="88px" rounded="l3" />
          <Skeleton h="88px" rounded="l3" />
        </Stack>
      ) : entries.length === 0 ? (
        <Flex flex={1} align="center" justify="center" py={10}>
          <EmptyState title="Chưa có lịch sử chuyển bàn/món" />
        </Flex>
      ) : (
        <>
          {entries.map((entry) => (
            <TableTransferEventCard key={entry.id} entry={entry} />
          ))}

          <Text fontSize="xs" color="fg.muted" textAlign="center">
            {entries.length}/{data?.total ?? entries.length} kết quả
          </Text>

          {hasMore && (
            <Button size="sm" variant="outline" loading={isFetching} onClick={() => setPage((p) => p + 1)}>
              Xem thêm
            </Button>
          )}
        </>
      )}
    </Stack>
  );
}
