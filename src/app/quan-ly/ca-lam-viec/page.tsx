import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { parsePageSize } from "~/lib/pagination";
import { ShiftList } from "./shift-list";

export default async function CaLamViecPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string }>;
}) {
  const { page: pageParam, pageSize: pageSizeParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);
  const shiftStatus = status === "open" || status === "closed" ? status : undefined;

  void api.shift.list.prefetch({ page, pageSize, status: shiftStatus });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <ShiftList page={page} pageSize={pageSize} status={shiftStatus} />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
