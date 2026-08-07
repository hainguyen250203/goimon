import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { AssistantShell } from "./assistant-shell";

const PAGE_SIZE = 20;

export default async function TroLyAiPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  // /quan-ly/layout.tsx chỉ chặn khi KHÔNG có quyền quan-ly nào — trang này
  // cần riêng "tro-ly-ai.get", phải tự chặn thêm ở đây. Không chặn thì role
  // thiếu quyền vẫn vào được UI nhưng gọi tRPC FORBIDDEN, kẹt loading vô thời
  // hạn thay vì bị chặn rõ ràng (xem CLAUDE.md).
  const session = await getSession();
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "tro-ly-ai.get")) {
    redirect("/quan-ly");
  }

  const { session: sessionIdParam } = await searchParams;
  const sessionId = sessionIdParam ? Number(sessionIdParam) || undefined : undefined;

  // await (không void như các trang khác) — SessionSidebar/ChatPanel render
  // hẳn 1 nhánh DOM KHÁC HẲN kiểu thẻ lúc chưa có data (`<Text>` placeholder
  // "Chưa có phiên...", `<Spinner>`) so với lúc có data (`<SessionItem>`,
  // danh sách tin nhắn) — nếu chỉ void, SSR render trước khi prefetch xong
  // (còn ở nhánh rỗng) trong khi client hydrate đã có sẵn cache (nhánh có
  // data), lệch hẳn loại thẻ tại cùng vị trí → React hydration error thật
  // (không phải cảnh báo vô hại), phải bỏ cây SSR và render lại từ đầu ở
  // client. Await ở đây đảm bảo SSR luôn render đúng nhánh có data.
  await api.assistant.listSessions.prefetch({ page: 1, pageSize: PAGE_SIZE });
  if (sessionId) {
    await api.assistant.getSession.prefetch({ id: sessionId });
  }

  return (
    <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        {/* AdminShell không set padding — trang này tự set padding = 0 để
            chat chiếm toàn bộ chiều cao (khác các trang danh sách thường,
            tự thêm p={{ base: 4, md: 6 }} bằng tay). */}
        <Box h="full">
          <AssistantShell activeSessionId={sessionId} userName={session!.user.name} />
        </Box>
      </Suspense>
    </HydrateClient>
  );
}
