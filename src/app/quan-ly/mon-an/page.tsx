import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { parsePageSize } from "~/lib/pagination";
import { MenuItemList } from "./menu-item-list";

export default async function MonAnPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; categoryId?: string; search?: string }>;
}) {
  // menu.list/listCategories là permissionProcedure("mon-an.get") — thiếu
  // guard riêng ở đây thì role không có quyền vẫn vào được UI (menu sidebar
  // đã ẩn link, nhưng gõ thẳng URL vẫn tới trang), gọi tRPC FORBIDDEN và
  // crash Suspense (listCategories dùng useSuspenseQuery) thay vì bị chặn rõ
  // ràng (xem CLAUDE.md).
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "mon-an.get")) {
    redirect("/quan-ly");
  }

  const {
    page: pageParam,
    pageSize: pageSizeParam,
    categoryId: categoryIdParam,
    search,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);
  const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;

  // Prefetch song song trên server — tránh waterfall khi client hydrate.
  void api.menu.list.prefetch({ page, pageSize, categoryId, search });
  void api.menu.listCategories.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <MenuItemList
          page={page}
          pageSize={pageSize}
          categoryId={categoryId}
          search={search}
          canCreate={hasPermission(permissions, "mon-an.tao")}
          canUpdate={hasPermission(permissions, "mon-an.sua")}
          canDelete={hasPermission(permissions, "mon-an.xoa")}
          canManageCategories={hasPermission(permissions, "mon-an.danh-muc")}
        />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
