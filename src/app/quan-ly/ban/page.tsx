import { Suspense } from "react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import type { TableStatus } from "~/modules/table/domain/restaurant-table.entity";
import { TableList } from "./table-list";

const PAGE_SIZE = 20;

export default async function BanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; areaId?: string; status?: string }>;
}) {
  const {
    page: pageParam,
    areaId: areaIdParam,
    status: statusParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const areaId = areaIdParam ? Number(areaIdParam) : undefined;
  const status =
    statusParam === "available" || statusParam === "occupied"
      ? (statusParam as TableStatus)
      : undefined;

  // Prefetch song song trên server — tránh waterfall khi client hydrate.
  void api.table.list.prefetch({ page, pageSize: PAGE_SIZE, areaId, status });
  void api.table.listAreas.prefetch();

  return (
    <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <TableList page={page} areaId={areaId} status={status} />
      </Suspense>
    </HydrateClient>
  );
}
