import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { parsePageSize } from "~/lib/pagination";
import type { TableStatus } from "~/modules/table/domain/restaurant-table.entity";
import { TableList } from "./table-list";

export default async function BanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; areaId?: string; status?: string }>;
}) {
  const {
    page: pageParam,
    pageSize: pageSizeParam,
    areaId: areaIdParam,
    status: statusParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);
  const areaId = areaIdParam ? Number(areaIdParam) : undefined;
  const status =
    statusParam === "available" || statusParam === "occupied"
      ? (statusParam as TableStatus)
      : undefined;

  // Prefetch song song trên server — tránh waterfall khi client hydrate.
  void api.table.list.prefetch({ page, pageSize, areaId, status });
  void api.table.listAreas.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <TableList page={page} pageSize={pageSize} areaId={areaId} status={status} />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
