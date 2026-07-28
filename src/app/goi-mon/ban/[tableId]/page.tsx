import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { ShiftGate } from "../../shift-gate";
import { OrderTableView } from "./order-table-view";
import { OrderTableSkeleton } from "./order-table-skeleton";

export default async function TableOrderPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId: tableIdParam } = await params;
  const tableId = Number(tableIdParam);

  void api.menu.listForOrdering.prefetch();
  void api.order.listTablesForOrdering.prefetch();
  void api.order.getTableOrder.prefetch({ tableId });

  return (
    <Suspense fallback={<OrderTableSkeleton />}>
      <ShiftGate>
        <HydrateClient>
          <Suspense fallback={<OrderTableSkeleton />}>
            <OrderTableView tableId={tableId} />
          </Suspense>
        </HydrateClient>
      </ShiftGate>
    </Suspense>
  );
}
