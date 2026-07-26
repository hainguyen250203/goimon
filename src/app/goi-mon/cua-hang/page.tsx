import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { StoreView } from "./store-view";

export default async function CuaHangPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <StoreView
      user={{
        name: session.user.name,
        role: session.user.role ?? "user",
        phoneNumber: session.user.phoneNumber,
      }}
    />
  );
}
