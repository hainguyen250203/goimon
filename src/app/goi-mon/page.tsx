import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { Skeleton } from "~/components/ui/skeleton";
import { ShiftGate } from "./shift-gate";
import { TableSelector } from "./table-selector";

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
    <Suspense fallback={<Skeleton h="full" rounded="none" />}>
      <ShiftGate>
        <HydrateClient>
          <Suspense fallback={<Skeleton h="full" rounded="none" />}>
            <TableSelector areaId={areaId} />
          </Suspense>
        </HydrateClient>
      </ShiftGate>
    </Suspense>
  );
}
