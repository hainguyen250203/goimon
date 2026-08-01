import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { parsePageSize } from "~/lib/pagination";
import { SessionHistoryList } from "./session-history-list";

export default async function LichSuTroChuyenAiPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; userId?: string }>;
}) {
  // Trang giám sát phiên chat AI của MỌI user — chỉ superadmin (listAllSessions
  // dùng superadminProcedure), khác /quan-ly/tro-ly-ai (chỉ chat của chính
  // người đang đăng nhập). Không chặn ở đây thì admin vẫn vào được UI nhưng
  // gọi tRPC FORBIDDEN, kẹt loading vô thời hạn thay vì bị chặn rõ ràng.
  const session = await getSession();
  if (session?.user.role !== "superadmin") {
    redirect("/quan-ly");
  }

  const { page: pageParam, pageSize: pageSizeParam, userId } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.assistant.listAllSessions.prefetch({ page, pageSize, userId });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
        <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
          <SessionHistoryList page={page} pageSize={pageSize} userId={userId} />
        </Suspense>
      </HydrateClient>
    </Box>
  );
}
