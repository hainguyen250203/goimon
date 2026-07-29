import { Suspense } from "react";
import { Skeleton } from "~/components/ui/skeleton";

import { getSession } from "~/server/better-auth/server";
import { api, HydrateClient } from "~/trpc/server";
import { PaymentConfigView } from "./payment-config-view";

export default async function ThanhToanPage() {
  const session = await getSession();
  const canEdit = session?.user.role === "admin";

  void api.paymentConfig.get.prefetch();

  return (
    <HydrateClient>
      <Suspense fallback={<Skeleton h={40} rounded="l3" />}>
        <PaymentConfigView canEdit={canEdit} />
      </Suspense>
    </HydrateClient>
  );
}
