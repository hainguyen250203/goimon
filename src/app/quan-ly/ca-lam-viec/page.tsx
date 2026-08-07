import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { parsePageSize } from "~/lib/pagination";
import { ShiftList } from "./shift-list";

export default async function CaLamViecPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string }>;
}) {
  // shift.list là permissionProcedure("ca-lam-viec.get") — trang này trước
  // giờ hoàn toàn KHÔNG có guard nào, tự chặn ở đây (gõ thẳng URL vẫn tới
  // trang nếu thiếu quyền, xem CLAUDE.md).
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "ca-lam-viec.get")) {
    redirect("/quan-ly");
  }

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
