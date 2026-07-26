"use client";

import { Flex, Stack } from "@chakra-ui/react";

import { EmptyState } from "~/components/ui/empty-state";
import { TimelineEventCard } from "~/components/order-timeline/timeline-event-card";
import { api } from "~/trpc/react";

export function OrderTimelineList({ orderId }: { orderId: number }) {
  const [events] = api.order.getOrderTimeline.useSuspenseQuery({ orderId });

  if (events.length === 0) {
    return (
      <Flex flex={1} align="center" justify="center" py={10}>
        <EmptyState title="Chưa có lịch sử" />
      </Flex>
    );
  }

  return (
    <Stack gap={{ base: 1.5, lg: 2 }}>
      {events.map((entry) => (
        <TimelineEventCard key={entry.id} entry={entry} />
      ))}
    </Stack>
  );
}
