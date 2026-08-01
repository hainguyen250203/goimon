import { Box, Flex } from "@chakra-ui/react";

import { api, HydrateClient } from "~/trpc/server";
import { PageHeader } from "../../page-header";
import { LichSuTabs } from "./lich-su-tabs";

const PAGE_SIZE = 20;

export default function LichSuPage() {
  // currentShiftOnly: true khớp với query client ở order-history-list.tsx —
  // thiếu cờ này khiến query key lệch nhau, prefetch bị bỏ phí (client vẫn
  // phải tự fetch lại từ đầu đúng scope ca hiện tại).
  void api.order.list.prefetch({ page: 1, pageSize: PAGE_SIZE, currentShiftOnly: true });
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
