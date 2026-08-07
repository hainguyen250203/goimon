import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { api, HydrateClient } from "~/trpc/server";
import { PaymentConfigView } from "./payment-config-view";

export default async function ThanhToanPage() {
  // paymentConfig.get là permissionProcedure("thanh-toan.get") — tự chặn ở
  // đây (gõ thẳng URL vẫn tới trang nếu thiếu quyền, xem CLAUDE.md).
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "thanh-toan.get")) {
    redirect("/quan-ly");
  }
  const canEdit = hasPermission(permissions, "thanh-toan.sua");

  void api.paymentConfig.get.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={40} rounded="l3" />}>
        <PaymentConfigView canEdit={canEdit} />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
