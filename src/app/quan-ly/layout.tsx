import { redirect } from "next/navigation";

import { AdminShell } from "~/components/layout/admin-shell";
import { getSession } from "~/server/better-auth/server";

export default async function QuanLyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { role } = session.user;
  if (role !== "manager" && role !== "admin" && role !== "superadmin" && role !== "viewer") {
    redirect("/goi-mon");
  }

  return (
    <AdminShell
      user={{
        name: session.user.name,
        role,
        phoneNumber: session.user.phoneNumber,
      }}
    >
      {children}
    </AdminShell>
  );
}
