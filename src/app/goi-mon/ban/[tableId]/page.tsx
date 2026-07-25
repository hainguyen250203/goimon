import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { Skeleton } from "~/components/ui/skeleton";
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
    <HydrateClient>
      <Suspense fallback={<Skeleton h="full" rounded="none" />}>
        <MenuBrowser tableId={tableId} />
      </Suspense>
    </HydrateClient>
  );
}
