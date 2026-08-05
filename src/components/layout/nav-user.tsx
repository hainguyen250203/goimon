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
import { StatusDot } from "~/components/ui/status-dot";
import { authClient } from "~/server/better-auth/client";
import { ThemeToggle } from "./theme-toggle";

// Export để store-view.tsx (tab "Cửa hàng" ở /goi-mon) dùng chung — cùng
// thuộc phạm vi "layout chrome", tránh định nghĩa trùng lần thứ 3.
export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Quản lý",
  user: "Nhân viên",
  superadmin: "Super Admin",
  viewer: "Người xem",
};

export const ROLE_DOT_COLOR: Record<string, string> = {
  admin: "purple.500",
  manager: "blue.500",
  user: "gray.400",
  superadmin: "red.500",
  viewer: "cyan.500",
};

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
              <Flex align="center" gap={2}>
                <Text fontSize="sm" fontWeight="semibold">
                  {user.name}
                </Text>
                <StatusDot color={ROLE_DOT_COLOR[user.role] ?? "gray.400"}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </StatusDot>
              </Flex>
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
