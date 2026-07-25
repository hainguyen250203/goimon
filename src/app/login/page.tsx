import { Flex } from "@chakra-ui/react";

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
    <Flex as="main" minH="100vh" align="center" justify="center" p={4}>
      <LoginForm />
    </Flex>
  );
}
