import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { hasAnyAdminAccess } from "~/components/layout/nav-config";
import { StoreView } from "./store-view";

export default async function CuaHangPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const permissions = await getMyPermissions();

  return (
    <StoreView
      user={{
        name: session.user.name,
        phoneNumber: session.user.phoneNumber,
      }}
      canManageShift={hasPermission(permissions, "ca-lam-viec.mo-dong")}
      canAccessAdmin={hasAnyAdminAccess(permissions)}
    />
  );
}
