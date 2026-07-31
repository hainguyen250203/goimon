import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
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
  // /quan-ly/layout.tsx chỉ chặn role "user" — route này CHỈ superadmin (list
  // dùng superadminProcedure), admin không còn xem được nữa (khác các trang
  // admin-only khác — đây là 1 trong số ít trang cần THU HẸP thay vì mở rộng,
  // xem CLAUDE.md). Không chặn thì admin vẫn vào được UI nhưng gọi tRPC
  // FORBIDDEN, kẹt loading vô thời hạn thay vì bị chặn rõ ràng.
  const session = await getSession();
  if (session?.user.role !== "superadmin") {
    redirect("/quan-ly");
  }

  const { page: pageParam, entityType } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.activityLog.list.prefetch({ page, pageSize: PAGE_SIZE, entityType });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <ActivityLogList page={page} entityType={entityType} />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
