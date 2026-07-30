import { Suspense } from "react";
import { Box } from "@chakra-ui/react";

import { Skeleton } from "~/components/ui/skeleton";
import { api, HydrateClient } from "~/trpc/server";
import { DashboardOverview } from "./dashboard-overview";

export default async function QuanLyDashboardPage() {
  void api.dashboard.getOverview.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
        <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
          <DashboardOverview />
        </Suspense>
      </HydrateClient>
    </Box>
  );
}
