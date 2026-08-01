import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { SessionTranscript } from "./session-transcript";

export default async function LichSuTroChuyenAiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (session?.user.role !== "superadmin") {
    redirect("/quan-ly");
  }

  const { id: idParam } = await params;
  const id = Number(idParam);

  // await (không void) — tránh hydration mismatch giữa SSR và client, đúng lý
  // do đã áp dụng ở /quan-ly/tro-ly-ai/page.tsx (component con dùng useQuery
  // thường, không phải useSuspenseQuery, nên loading/loaded DOM có thể khác
  // cấu trúc nếu prefetch chưa kịp xong lúc client hydrate).
  await api.assistant.getSessionDetail.prefetch({ id });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
        <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
          <SessionTranscript id={id} />
        </Suspense>
      </HydrateClient>
    </Box>
  );
}
