import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { Skeleton } from "~/components/ui/skeleton";
import { ShiftGate } from "../../shift-gate";
import { MenuBrowser } from "./menu-browser";

export default async function TableOrderPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId: tableIdParam } = await params;
  const tableId = Number(tableIdParam);

  void api.menu.listForOrdering.prefetch();
  void api.order.listTablesForOrdering.prefetch();

  return (
    <Suspense fallback={<Skeleton h="full" rounded="none" />}>
      <ShiftGate>
        <HydrateClient>
          <Suspense fallback={<Skeleton h="full" rounded="none" />}>
            <MenuBrowser tableId={tableId} />
          </Suspense>
        </HydrateClient>
      </ShiftGate>
    </Suspense>
  );
}
