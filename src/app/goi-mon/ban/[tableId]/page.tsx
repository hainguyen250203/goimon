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
  // KHÔNG prefetch listTablesForOrdering ở đây — /goi-mon (trang trước đó)
  // vừa fetch xong cùng query này; React Query client giữ nguyên cache đó
  // qua điều hướng client-side (router.push, không phải hard reload) nên
  // OrderTableView đọc lại được ngay, không cần server query DB thêm 1 lần
  // nữa cho cùng 1 dữ liệu.
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
