import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { AssistantShell } from "./assistant-shell";

const PAGE_SIZE = 20;

export default async function TroLyAiPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  // /quan-ly/layout.tsx chỉ chặn role "user", không phân biệt manager/admin —
  // trang này chỉ admin (router dùng adminProcedure), phải tự chặn thêm ở đây.
  // Không chặn thì manager vẫn vào được UI nhưng gọi tRPC FORBIDDEN, kẹt
  // loading vô thời hạn thay vì bị chặn rõ ràng (xem CLAUDE.md).
  const session = await getSession();
  if (session?.user.role !== "admin") {
    redirect("/quan-ly");
  }

  const { session: sessionIdParam } = await searchParams;
  const sessionId = sessionIdParam ? Number(sessionIdParam) || undefined : undefined;

  void api.assistant.listSessions.prefetch({ page: 1, pageSize: PAGE_SIZE });
  if (sessionId) {
    void api.assistant.getSession.prefetch({ id: sessionId });
  }

  return (
    <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        {/* AdminShell không set padding — trang này tự set padding = 0 để
            chat chiếm toàn bộ chiều cao (khác các trang danh sách thường,
            tự thêm p={{ base: 4, md: 6 }} bằng tay). */}
        <Box h="full">
          <AssistantShell activeSessionId={sessionId} />
        </Box>
      </Suspense>
    </HydrateClient>
  );
}
