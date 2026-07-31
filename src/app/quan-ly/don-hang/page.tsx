import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { hasMinRole } from "~/server/better-auth/role-rank";
import type { OrderStatus } from "~/modules/order/domain/order-list-item.entity";
import { OrderList } from "./order-list";

const PAGE_SIZE = 20;
const VALID_STATUS: OrderStatus[] = ["open", "paid", "cancelled", "transferred"];

export default async function DonHangPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; shiftId?: string }>;
}) {
  const session = await getSession();
  const canViewDeleted = session?.user.role === "superadmin";
  const canDelete = hasMinRole(session?.user.role, "admin");

  const { page: pageParam, status: statusParam, shiftId: shiftIdParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  // "status=deleted" chỉ có tác dụng với superadmin — non-superadmin gõ tay
  // URL này rơi về danh sách thường (status=undefined), không lỗi, không lộ
  // dữ liệu (xem CLAUDE.md/order.router.ts's FORBIDDEN check ở list).
  const deleted = statusParam === "deleted" && canViewDeleted;
  const status = !deleted && VALID_STATUS.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : undefined;
  const shiftId =
    shiftIdParam && Number.isInteger(Number(shiftIdParam)) && Number(shiftIdParam) > 0
      ? Number(shiftIdParam)
      : undefined;

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.order.list.prefetch({ page, pageSize: PAGE_SIZE, status, shiftId, deleted });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <OrderList
          page={page}
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
