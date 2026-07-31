import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { hasMinRole } from "~/server/better-auth/role-rank";
import { UsageSummaryTable } from "./usage-summary-table";

export default async function ThongKeTroLyAiPage() {
  const session = await getSession();
  if (!hasMinRole(session?.user.role, "admin")) {
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
