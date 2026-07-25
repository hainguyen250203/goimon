import { Suspense } from "react";

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

  void api.table.list.prefetch({ page, pageSize: PAGE_SIZE, areaId, status });
  void api.table.listAreas.prefetch();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <HydrateClient>
        <Suspense fallback={<TableListSkeleton />}>
          <TableList page={page} areaId={areaId} status={status} />
        </Suspense>
      </HydrateClient>
    </div>
  );
}

function TableListSkeleton() {
  return <div className="h-96 animate-pulse rounded-lg border bg-muted/30" />;
}
