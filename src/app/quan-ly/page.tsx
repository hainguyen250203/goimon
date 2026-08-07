import { Suspense } from "react";
import { Box } from "@chakra-ui/react";

import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { DashboardOverview } from "./dashboard-overview";

export default async function QuanLyDashboardPage() {
  // dashboard.getOverview là permissionProcedure("dashboard.get") — trang
  // này là ĐÍCH mọi guard khác redirect tới khi thiếu quyền, nên không thể tự
  // redirect("/quan-ly") (lặp vô hạn) như các trang khác — hiện EmptyState
  // thay vì crash Suspense nếu role không có "dashboard.get" (layout.tsx chỉ
  // đảm bảo có ÍT NHẤT 1 quyền quan-ly nào đó, không chắc là quyền này).
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "dashboard.get")) {
    return (
      <Box p={{ base: 4, md: 6 }}>
        <EmptyState
          title="Không có quyền xem Tổng quan"
          description="Chọn 1 trang khác ở menu bên trái."
        />
      </Box>
    );
  }

  void api.dashboard.getOverview.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
        <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
          <DashboardOverview />
        </Suspense>
      </HydrateClient>
    </Box>
  );
}
