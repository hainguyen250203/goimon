"use client";

import { useRouter } from "nextjs-toploader/app";
import { Flex, IconButton, Separator, Stack, Text } from "@chakra-ui/react";
import { LogOut } from "lucide-react";

import { Avatar } from "~/components/ui/avatar";
import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import { authClient } from "~/server/better-auth/client";
import { ThemeToggle } from "./theme-toggle";

export function NavUser({
  user,
}: {
  user: { name: string; role: string; phoneNumber?: string | null };
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <MenuRoot positioning={{ placement: "bottom-end" }}>
      <MenuTrigger asChild>
        <IconButton variant="ghost" rounded="full" size="sm" aria-label="Tài khoản">
          <Avatar name={user.name} size="sm" />
        </IconButton>
      </MenuTrigger>
      <MenuContent minW="18rem">
        <Stack gap={3} px={3} py={2}>
          <Flex align="center" gap={3}>
            <Avatar name={user.name} size="lg" />
            <Stack gap="1px">
              <Text fontSize="sm" fontWeight="semibold">
                {user.name}
              </Text>
              {user.phoneNumber ? (
                <Text fontSize="xs" color="fg.muted">
                  {user.phoneNumber}
                </Text>
              ) : null}
            </Stack>
          </Flex>
        </Stack>

        <Separator />

        <Flex align="center" justify="space-between" px={3} py={2}>
          <Text fontSize="sm">Giao diện</Text>
          <ThemeToggle />
        </Flex>

        <Separator />

        <MenuItemGroup>
          <MenuItem value="logout" color="fg.error" onClick={handleSignOut}>
            <LogOut size={16} />
            Đăng xuất
          </MenuItem>
        </MenuItemGroup>
      </MenuContent>
    </MenuRoot>
  );
}
