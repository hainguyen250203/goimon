import { Suspense } from "react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { ShiftList } from "./shift-list";

const PAGE_SIZE = 20;

export default async function CaLamViecPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const shiftStatus = status === "open" || status === "closed" ? status : undefined;

  void api.shift.list.prefetch({ page, pageSize: PAGE_SIZE, status: shiftStatus });

  return (
    <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <ShiftList page={page} status={shiftStatus} />
      </Suspense>
    </HydrateClient>
  );
}
