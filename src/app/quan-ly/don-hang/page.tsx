import { Suspense } from "react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import type { OrderStatus } from "~/modules/order/domain/order-list-item.entity";
import { OrderList } from "./order-list";

const PAGE_SIZE = 20;
const VALID_STATUS: OrderStatus[] = ["open", "paid", "cancelled", "transferred"];

export default async function DonHangPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; shiftId?: string }>;
}) {
  const { page: pageParam, status: statusParam, shiftId: shiftIdParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const status = VALID_STATUS.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : undefined;
  const shiftId =
    shiftIdParam && Number.isInteger(Number(shiftIdParam)) && Number(shiftIdParam) > 0
      ? Number(shiftIdParam)
      : undefined;

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.order.list.prefetch({ page, pageSize: PAGE_SIZE, status, shiftId });

  return (
    <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <OrderList page={page} status={status} shiftId={shiftId} />
      </Suspense>
    </HydrateClient>
  );
}
