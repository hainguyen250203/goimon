import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";

import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { RoleForm } from "../role-form";

export default async function TaoVaiTroPage() {
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "vai-tro.tao")) {
    redirect("/quan-ly/vai-tro");
  }

  return (
    <Box p={{ base: 4, md: 6 }}>
      <RoleForm />
    </Box>
  );
}
