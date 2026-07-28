import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { ShiftGate } from "./shift-gate";
import { TableSelector } from "./table-selector";
import { TableSelectorSkeleton } from "./table-selector-skeleton";

export default async function GoiMonPage({
  searchParams,
}: {
  searchParams: Promise<{ khuvuc?: string }>;
}) {
  const { khuvuc: areaParam } = await searchParams;
  const areaId = areaParam ? Number(areaParam) : undefined;

  void api.table.listAreas.prefetch();
  void api.order.listTablesForOrdering.prefetch();

  return (
    <Suspense fallback={<TableSelectorSkeleton />}>
      <ShiftGate>
        <HydrateClient>
          <Suspense fallback={<TableSelectorSkeleton />}>
            <TableSelector areaId={areaId} />
          </Suspense>
        </HydrateClient>
      </ShiftGate>
    </Suspense>
  );
}
