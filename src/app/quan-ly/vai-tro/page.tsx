import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { RoleList } from "./role-list";

export default async function VaiTroPage() {
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "vai-tro.get")) {
    redirect("/quan-ly");
  }

  void api.role.list.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
        <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
          <RoleList
            canCreate={hasPermission(permissions, "vai-tro.tao")}
            canEdit={hasPermission(permissions, "vai-tro.sua")}
            canDelete={hasPermission(permissions, "vai-tro.xoa")}
          />
        </Suspense>
      </HydrateClient>
    </Box>
  );
}
