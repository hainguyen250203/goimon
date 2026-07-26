import { redirect } from "next/navigation";
import { Flex } from "@chakra-ui/react";

import { getSession } from "~/server/better-auth/server";
import { BottomNav } from "./bottom-nav";

export default async function GoiMonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <Flex direction="column" h="100dvh" overflow="hidden" bg="bg.subtle">
      <Flex flex={1} direction="column" minH={0} overflow="hidden">
        {children}
      </Flex>
      <BottomNav />
    </Flex>
  );
}
