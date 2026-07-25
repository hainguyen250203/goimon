import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { getRoleHomePath } from "~/server/better-auth/role-redirect";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(getRoleHomePath(session.user.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
