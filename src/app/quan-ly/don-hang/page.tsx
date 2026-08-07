import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { parsePageSize } from "~/lib/pagination";
import type { OrderStatus } from "~/modules/order/domain/order-list-item.entity";
import { OrderList } from "./order-list";

const VALID_STATUS: OrderStatus[] = ["open", "paid", "cancelled", "transferred"];

export default async function DonHangPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string; shiftId?: string }>;
}) {
  // order.router.ts's `list` giờ là staffProcedure (dùng chung goi-mon, không
  // tự chặn quyền) — trang admin này phải tự chặn riêng "don-hang.get" ở đây.
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "don-hang.get")) {
    redirect("/quan-ly");
  }
  const canViewDeleted = hasPermission(permissions, "don-hang.xem-da-xoa");
  const canDelete = hasPermission(permissions, "don-hang.xoa-don");

  const {
    page: pageParam,
    pageSize: pageSizeParam,
    status: statusParam,
    shiftId: shiftIdParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);
  // "status=deleted" chỉ có tác dụng khi có "don-hang.xem-da-xoa" (hoặc
  // isSuper) — người khác gõ tay URL này rơi về danh sách thường
  // (status=undefined), không lỗi, không lộ dữ liệu (xem order.router.ts's
  // requireCanViewDeleted).
  const deleted = statusParam === "deleted" && canViewDeleted;
  const status = !deleted && VALID_STATUS.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : undefined;
  const shiftId =
    shiftIdParam && Number.isInteger(Number(shiftIdParam)) && Number(shiftIdParam) > 0
      ? Number(shiftIdParam)
      : undefined;

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.order.list.prefetch({ page, pageSize, status, shiftId, deleted });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <OrderList
          page={page}
          pageSize={pageSize}
          status={status}
          shiftId={shiftId}
          deleted={deleted}
          canViewDeleted={canViewDeleted}
          canDelete={canDelete}
        />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
