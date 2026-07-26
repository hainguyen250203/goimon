import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box, Flex } from "@chakra-ui/react";

import { api, HydrateClient } from "~/trpc/server";
import { Skeleton } from "~/components/ui/skeleton";
import { OrderTimelineHeader } from "./order-timeline-header";
import { OrderTimelineList } from "./order-timeline-list";

export default async function OrderTimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { tableId: tableIdParam } = await params;
  const { orderId: orderIdParam } = await searchParams;
  const tableId = Number(tableIdParam);
  const orderId = Number(orderIdParam);

  if (!orderIdParam || !Number.isInteger(orderId) || orderId <= 0) {
    redirect(`/goi-mon/ban/${tableId}/don`);
  }

  void api.order.getOrderTimeline.prefetch({ orderId });

  return (
    <Flex direction="column" flex={1} minH={0}>
      <OrderTimelineHeader tableId={tableId} />
      <Box flex={1} minH={0} overflowY="auto" bg="bg.subtle" p={{ base: 3, lg: 4 }}>
        <HydrateClient>
          <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
            <OrderTimelineList orderId={orderId} />
          </Suspense>
        </HydrateClient>
      </Box>
    </Flex>
  );
}
