import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { MenuItemList } from "./menu-item-list";

const PAGE_SIZE = 20;

export default async function MonAnPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; categoryId?: string }>;
}) {
  const { page: pageParam, categoryId: categoryIdParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;

  // Prefetch song song trên server — tránh waterfall khi client hydrate.
  void api.menu.list.prefetch({ page, pageSize: PAGE_SIZE, categoryId });
  void api.menu.listCategories.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <MenuItemList page={page} categoryId={categoryId} />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
