import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { getRoleHomePath } from "~/server/better-auth/role-redirect";

export default async function Home() {
  const session = await getSession();
  redirect(session ? getRoleHomePath(session.user.role) : "/login");
}
