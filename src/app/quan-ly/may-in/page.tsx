import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { canManage } from "~/server/better-auth/role-rank";
import { parsePageSize } from "~/lib/pagination";
import { PrinterList } from "./printer-list";

export default async function MayInPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string }>;
}) {
  const { page: pageParam, pageSize: pageSizeParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);
  const isActive =
    status === "active" ? true : status === "inactive" ? false : undefined;

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.printer.list.prefetch({ page, pageSize, isActive });

  const session = await getSession();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <PrinterList
          page={page}
          pageSize={pageSize}
          isActive={isActive}
          canManage={canManage(session?.user.role)}
        />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
