import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { canManage } from "~/server/better-auth/role-rank";
import { parsePageSize } from "~/lib/pagination";
import type { TableOccupancyStatus } from "~/modules/table/application/list-tables.usecase";
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
      ? (statusParam as TableOccupancyStatus)
      : undefined;

  // Prefetch song song trên server — tránh waterfall khi client hydrate.
  void api.table.list.prefetch({ page, pageSize, areaId, status });
  void api.table.listAreas.prefetch();

  const session = await getSession();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <TableList
          page={page}
          pageSize={pageSize}
          areaId={areaId}
          status={status}
          canManage={canManage(session?.user.role)}
        />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
