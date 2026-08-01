import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { parsePageSize } from "~/lib/pagination";
import { MenuItemList } from "./menu-item-list";

export default async function MonAnPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; categoryId?: string; search?: string }>;
}) {
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
        <MenuItemList page={page} pageSize={pageSize} categoryId={categoryId} search={search} />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
