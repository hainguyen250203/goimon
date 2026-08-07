import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Box } from "@chakra-ui/react";

import { Skeleton } from "~/components/ui/skeleton";
import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { EditRoleView } from "./edit-role-view";

export default async function SuaVaiTroPage({ params }: { params: Promise<{ id: string }> }) {
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "vai-tro.sua")) {
    redirect("/quan-ly/vai-tro");
  }

  const { id: idParam } = await params;
  const id = Number(idParam);

  void api.role.list.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
        <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
          <EditRoleView id={id} />
        </Suspense>
      </HydrateClient>
    </Box>
  );
}
