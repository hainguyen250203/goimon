"use client";

import { Box, Flex } from "@chakra-ui/react";

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
import { OrderTimeline } from "~/components/order-timeline/order-timeline";
import { api } from "~/trpc/react";

/** Dialog xem lịch sử 1 order — dùng chung cho cả admin (/quan-ly/don-hang) lẫn luồng gọi món (/goi-mon). */
export function OrderHistoryDialog({
  open,
  onOpenChange,
  orderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
}) {
  // staleTime 0 (đè default 30s toàn app) — mỗi lần mở dialog phải là lịch
  // sử mới nhất, không hiện data cũ từ lần mở trước nếu vừa có cập nhật món.
  const { data: events, isLoading } = api.order.getOrderTimeline.useQuery(
    { orderId },
    { enabled: open, staleTime: 0 },
  );

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent maxW={{ base: "calc(100vw - 24px)", sm: "480px" }} mx="auto">
        <DialogHeader>
          <DialogTitle>Lịch sử đơn #{orderId}</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          {/* Cuộn bên trong dialog thay vì để cả dialog phình theo số event. */}
          <Box maxH="60vh" overflowY="auto">
            {isLoading ? (
              <Skeleton h={20} rounded="l2" />
            ) : !events || events.length === 0 ? (
              <Flex align="center" justify="center" py={10}>
                <EmptyState title="Chưa có lịch sử" />
              </Flex>
            ) : (
              <OrderTimeline events={events} />
            )}
          </Box>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
