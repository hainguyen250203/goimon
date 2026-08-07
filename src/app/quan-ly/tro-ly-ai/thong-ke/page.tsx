import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { UsageSummaryTable } from "./usage-summary-table";

export default async function ThongKeTroLyAiPage() {
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "tro-ly-ai-thong-ke.get")) {
    redirect("/quan-ly");
  }

  void api.assistant.getUsageSummary.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <UsageSummaryTable />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
