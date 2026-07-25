import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { PrinterList } from "./printer-list";

const PAGE_SIZE = 20;

export default async function MayInPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const isActive =
    status === "active" ? true : status === "inactive" ? false : undefined;

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.printer.list.prefetch({ page, pageSize: PAGE_SIZE, isActive });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <HydrateClient>
        <Suspense fallback={<PrinterListSkeleton />}>
          <PrinterList page={page} isActive={isActive} />
        </Suspense>
      </HydrateClient>
    </div>
  );
}

function PrinterListSkeleton() {
  return <div className="h-96 animate-pulse rounded-lg border bg-muted/30" />;
}
