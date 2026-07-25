import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { Skeleton } from "~/components/ui/skeleton";
import { OrderCartView } from "./order-cart-view";

export default async function OrderCartPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId: tableIdParam } = await params;
  const tableId = Number(tableIdParam);

  void api.order.getTableOrder.prefetch({ tableId });
  void api.order.listTablesForOrdering.prefetch();

  return (
    <HydrateClient>
      <Suspense fallback={<Skeleton h="full" rounded="none" />}>
        <OrderCartView tableId={tableId} />
      </Suspense>
    </HydrateClient>
  );
}
