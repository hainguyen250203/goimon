import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";

export default async function GoiMonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return children;
}
