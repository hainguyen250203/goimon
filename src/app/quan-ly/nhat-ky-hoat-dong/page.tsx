import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { ActivityLogList } from "./activity-log-list";

const PAGE_SIZE = 20;

export default async function NhatKyHoatDongPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entityType?: string }>;
}) {
  // /quan-ly/layout.tsx chỉ chặn role "user", không phân biệt manager/admin —
  // route này chỉ admin (list dùng adminProcedure), phải tự chặn thêm ở đây.
  // Không chặn thì manager vẫn vào được UI nhưng gọi tRPC FORBIDDEN, kẹt
  // loading vô thời hạn thay vì bị chặn rõ ràng (xem CLAUDE.md).
  const session = await getSession();
  if (session?.user.role !== "admin") {
    redirect("/quan-ly");
  }

  const { page: pageParam, entityType } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.activityLog.list.prefetch({ page, pageSize: PAGE_SIZE, entityType });

  return (
    <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <ActivityLogList page={page} entityType={entityType} />
      </Suspense>
    </HydrateClient>
  );
}
