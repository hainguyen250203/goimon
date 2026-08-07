import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { parsePageSize } from "~/lib/pagination";
import { PromotionList } from "./promotion-list";

export default async function KhuyenMaiPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string }>;
}) {
  // promotion.list là permissionProcedure("khuyen-mai.get") — tự chặn ở đây
  // (gõ thẳng URL vẫn tới trang nếu thiếu quyền, xem CLAUDE.md).
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "khuyen-mai.get")) {
    redirect("/quan-ly");
  }

  const { page: pageParam, pageSize: pageSizeParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);
  const isActive =
    status === "active" ? true : status === "inactive" ? false : undefined;

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.promotion.list.prefetch({ page, pageSize, isActive });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <PromotionList
          page={page}
          pageSize={pageSize}
          isActive={isActive}
          canCreate={hasPermission(permissions, "khuyen-mai.tao")}
          canUpdate={hasPermission(permissions, "khuyen-mai.sua")}
          canDelete={hasPermission(permissions, "khuyen-mai.xoa")}
        />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
