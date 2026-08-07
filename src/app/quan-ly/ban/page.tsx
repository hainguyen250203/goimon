import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { parsePageSize } from "~/lib/pagination";
import type { TableOccupancyStatus } from "~/modules/table/application/list-tables.usecase";
import { TableList } from "./table-list";

export default async function BanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; areaId?: string; status?: string }>;
}) {
  // table.list là permissionProcedure("ban.get") — tự chặn ở đây, không dựa
  // vào nav sidebar ẩn link (gõ thẳng URL vẫn tới trang nếu thiếu, xem CLAUDE.md).
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "ban.get")) {
    redirect("/quan-ly");
  }

  const {
    page: pageParam,
    pageSize: pageSizeParam,
    areaId: areaIdParam,
    status: statusParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);
  const areaId = areaIdParam ? Number(areaIdParam) : undefined;
  const status =
    statusParam === "available" || statusParam === "occupied"
      ? (statusParam as TableOccupancyStatus)
      : undefined;

  // Prefetch song song trên server — tránh waterfall khi client hydrate.
  void api.table.list.prefetch({ page, pageSize, areaId, status });
  void api.table.listAreas.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <TableList
          page={page}
          pageSize={pageSize}
          areaId={areaId}
          status={status}
          canCreate={hasPermission(permissions, "ban.tao")}
          canUpdate={hasPermission(permissions, "ban.sua")}
          canDelete={hasPermission(permissions, "ban.xoa")}
          canManageAreas={hasPermission(permissions, "ban.khu-vuc")}
        />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
