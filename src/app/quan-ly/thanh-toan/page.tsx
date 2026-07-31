import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { getSession } from "~/server/better-auth/server";
import { hasMinRole } from "~/server/better-auth/role-rank";
import { api, HydrateClient } from "~/trpc/server";
import { PaymentConfigView } from "./payment-config-view";

export default async function ThanhToanPage() {
  const session = await getSession();
  const canEdit = hasMinRole(session?.user.role, "admin");

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
