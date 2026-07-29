import { Box, Flex } from "@chakra-ui/react";

import { api, HydrateClient } from "~/trpc/server";
import { PageHeader } from "../../page-header";
import { LichSuTabs } from "./lich-su-tabs";

const PAGE_SIZE = 20;

export default function LichSuPage() {
  void api.order.list.prefetch({ page: 1, pageSize: PAGE_SIZE });
  void api.order.listOrderItemEvents.prefetch({ page: 1, pageSize: PAGE_SIZE });
  void api.order.listTableTransferEvents.prefetch({ page: 1, pageSize: PAGE_SIZE });

  return (
    <Flex direction="column" flex={1} minH={0}>
      <PageHeader title="Lịch sử" backHref="/goi-mon/cua-hang" />
      <Box flex={1} minH={0} overflowY="auto" bg="bg.subtle" p={{ base: 2, lg: 3 }}>
        <HydrateClient>
          <LichSuTabs />
        </HydrateClient>
      </Box>
    </Flex>
  );
}
