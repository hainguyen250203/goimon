import { redirect } from "next/navigation";

import { AdminShell } from "~/components/layout/admin-shell";
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
  // Không có bất kỳ quyền quan-ly nào (không isSuper, không .get key nào) —
  // vd role "user" (chỉ dùng goi-mon) — đá về /goi-mon.
  if (!permissions.isSuper && permissions.keys.length === 0) {
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
