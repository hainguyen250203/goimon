import { Box, Flex } from "@chakra-ui/react";

import { api, HydrateClient } from "~/trpc/server";
import { PageHeader } from "../../page-header";
import { OrderHistoryList } from "./order-history-list";

const PAGE_SIZE = 20;

export default function LichSuDonHangPage() {
  void api.order.list.prefetch({ page: 1, pageSize: PAGE_SIZE });

  return (
    <Flex direction="column" flex={1} minH={0}>
      <PageHeader title="Lịch sử đơn hàng" backHref="/goi-mon/cua-hang" />
      <Box flex={1} minH={0} overflowY="auto" bg="bg.subtle" p={{ base: 2, lg: 3 }}>
        <HydrateClient>
          <OrderHistoryList />
        </HydrateClient>
      </Box>
    </Flex>
  );
}
