import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
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

  // Luồng gọi món cốt lõi (xem/gọi/thêm món, chuyển bàn/món, gộp bàn, in bill)
  // không cần permission key nào — nhưng thanh toán/huỷ đơn/xoá món/khuyến
  // mãi thì có (xem CLAUDE.md, permission-definitions.ts), nên phải tự resolve
  // ở đây rồi truyền xuống thay vì để SubmittedOrderPanel coi mọi thứ là public.
  const permissions = await getMyPermissions();

  return (
    <HydrateClient>
      <Suspense fallback={<OrderTableSkeleton />}>
        <OrderTableView
          tableId={tableId}
          canConfirmPayment={hasPermission(permissions, "don-hang.thanh-toan")}
          canCancel={hasPermission(permissions, "don-hang.huy")}
          canRemoveItems={hasPermission(permissions, "don-hang.xoa-mon")}
          canManagePromotion={hasPermission(permissions, "don-hang.khuyen-mai")}
        />
      </Suspense>
    </HydrateClient>
  );
}
