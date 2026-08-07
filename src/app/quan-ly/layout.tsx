import { redirect } from "next/navigation";

import { AdminShell } from "~/components/layout/admin-shell";
import { hasAnyAdminAccess } from "~/components/layout/nav-config";
import { getSession } from "~/server/better-auth/server";
import { getMyPermissions } from "~/modules/role/get-my-permissions";

export default async function QuanLyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const permissions = await getMyPermissions();
  // Không thấy được trang quản lý nào (không isSuper, không getKey nào của
  // ADMIN_NAV khớp) — vd role "user" (chỉ dùng goi-mon, dù có vài permission
  // hành động riêng cho Gọi món) — đá về /goi-mon. Xem hasAnyAdminAccess.
  if (!hasAnyAdminAccess(permissions)) {
    redirect("/goi-mon");
  }

  return (
    <AdminShell
      user={{
        name: session.user.name,
        role: session.user.role ?? "user",
        phoneNumber: session.user.phoneNumber,
      }}
      permissions={permissions}
    >
      {children}
    </AdminShell>
  );
}
