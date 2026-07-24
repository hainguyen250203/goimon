import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">POS System</h1>
      {session ? (
        <>
          <p>
            Đăng nhập với vai trò <strong>{session.user.role}</strong>
          </p>
          <form>
            <button
              className="rounded-md border px-4 py-2"
              formAction={async () => {
                "use server";
                await auth.api.signOut({ headers: await headers() });
                redirect("/");
              }}
            >
              Đăng xuất
            </button>
          </form>
        </>
      ) : (
        <p>Chưa đăng nhập.</p>
      )}
    </main>
  );
}
