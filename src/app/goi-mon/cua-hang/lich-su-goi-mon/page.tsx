import { Box, Flex } from "@chakra-ui/react";

import { api, HydrateClient } from "~/trpc/server";
import { PageHeader } from "../../page-header";
import { OrderItemEventsList } from "./order-item-events-list";

const PAGE_SIZE = 20;

export default function LichSuGoiMonPage() {
  void api.order.listOrderItemEvents.prefetch({ page: 1, pageSize: PAGE_SIZE });

  return (
    <Flex direction="column" flex={1} minH={0}>
      <PageHeader title="Lịch sử gọi món" backHref="/goi-mon/cua-hang" />
      <Box flex={1} minH={0} overflowY="auto" bg="bg.subtle" p={{ base: 2, lg: 3 }}>
        <HydrateClient>
          <OrderItemEventsList />
        </HydrateClient>
      </Box>
    </Flex>
  );
}
