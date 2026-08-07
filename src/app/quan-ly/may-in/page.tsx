import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { parsePageSize } from "~/lib/pagination";
import { PrinterList } from "./printer-list";

export default async function MayInPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string }>;
}) {
  // printer.list là permissionProcedure("may-in.get") — tự chặn ở đây (gõ
  // thẳng URL vẫn tới trang nếu thiếu quyền, xem CLAUDE.md).
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "may-in.get")) {
    redirect("/quan-ly");
  }

  const { page: pageParam, pageSize: pageSizeParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);
  const isActive =
    status === "active" ? true : status === "inactive" ? false : undefined;

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.printer.list.prefetch({ page, pageSize, isActive });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <PrinterList
          page={page}
          pageSize={pageSize}
          isActive={isActive}
          canCreate={hasPermission(permissions, "may-in.tao")}
          canUpdate={hasPermission(permissions, "may-in.sua")}
          canDelete={hasPermission(permissions, "may-in.xoa")}
          canScanNetwork={hasPermission(permissions, "may-in.quet-mang")}
        />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
