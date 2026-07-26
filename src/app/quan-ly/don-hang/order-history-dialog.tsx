"use client";

import { Flex, Stack } from "@chakra-ui/react";

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { TimelineEventCard } from "~/components/order-timeline/timeline-event-card";
import { api } from "~/trpc/react";

export function OrderHistoryDialog({
  open,
  onOpenChange,
  orderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
}) {
  const { data: events, isLoading } = api.order.getOrderTimeline.useQuery(
    { orderId },
    { enabled: open },
  );

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lịch sử đơn #{orderId}</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          {/* Cuộn bên trong dialog thay vì để cả dialog phình theo số event. */}
          <Stack gap={{ base: 1.5, lg: 2 }} maxH="60vh" overflowY="auto">
            {isLoading ? (
              <Skeleton h={20} rounded="l2" />
            ) : !events || events.length === 0 ? (
              <Flex align="center" justify="center" py={10}>
                <EmptyState title="Chưa có lịch sử" />
              </Flex>
            ) : (
              events.map((entry) => <TimelineEventCard key={entry.id} entry={entry} />)
            )}
          </Stack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
