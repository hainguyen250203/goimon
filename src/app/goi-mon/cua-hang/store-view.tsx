"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Flex, Separator, Stack, Text } from "@chakra-ui/react";
import { ClipboardList, History, LayoutDashboard, LogOut } from "lucide-react";

import { Avatar } from "~/components/ui/avatar";
import { StatusDot } from "~/components/ui/status-dot";
import { ThemeToggle } from "~/components/layout/theme-toggle";
import { ROLE_LABEL, ROLE_DOT_COLOR } from "~/components/layout/nav-user";
import { authClient } from "~/server/better-auth/client";
import { ShiftSection } from "./shift-section";

export function StoreView({
  user,
}: {
  user: { name: string; role: string; phoneNumber?: string | null };
}) {
  const router = useRouter();
  const canManage = user.role === "manager" || user.role === "admin";

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <Box flex={1} minH={0} overflowY="auto" bg="bg.subtle" p={{ base: 3, lg: 4 }}>
      <Stack gap={3}>
        <Flex
          align="center"
          justify="space-between"
          gap={3}
          bg="bg"
          p={{ base: 3, lg: 4 }}
          rounded="l2"
          borderWidth="1px"
          borderColor="border"
        >
          <Flex align="center" gap={3}>
            <Avatar name={user.name} size="lg" />
            <Stack gap="1px">
              <Flex align="center" gap={2}>
                <Text fontWeight="semibold">{user.name}</Text>
                <StatusDot color={ROLE_DOT_COLOR[user.role] ?? "gray.400"}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </StatusDot>
              </Flex>
              {user.phoneNumber && (
                <Text fontSize="xs" color="fg.muted">
                  {user.phoneNumber}
                </Text>
              )}
            </Stack>
          </Flex>
          <Button variant="ghost" colorPalette="red" size="sm" onClick={handleSignOut}>
            <LogOut size={16} />
            Đăng xuất
          </Button>
        </Flex>

        <Stack gap={0} bg="bg" rounded="l2" borderWidth="1px" borderColor="border" overflow="hidden">
          <Flex align="center" justify="space-between" px={4} py={3}>
            <Text fontSize="sm">Giao diện</Text>
            <ThemeToggle />
          </Flex>
          <Separator />
          <ShiftSection canManage={canManage} />
          <Separator />
          <Flex
            align="center"
            gap={2}
            px={4}
            py={3}
            cursor="pointer"
            _hover={{ bg: "bg.muted" }}
            onClick={() => router.push("/goi-mon/cua-hang/lich-su-don-hang")}
          >
            <ClipboardList size={16} />
            <Text fontSize="sm">Lịch sử đơn hàng</Text>
          </Flex>
          <Separator />
          <Flex
            align="center"
            gap={2}
            px={4}
            py={3}
            cursor="pointer"
            _hover={{ bg: "bg.muted" }}
            onClick={() => router.push("/goi-mon/cua-hang/lich-su-goi-mon")}
          >
            <History size={16} />
            <Text fontSize="sm">Lịch sử gọi món</Text>
          </Flex>
          {canManage && (
            <>
              <Separator />
              <Flex
                align="center"
                gap={2}
                px={4}
                py={3}
                cursor="pointer"
                _hover={{ bg: "bg.muted" }}
                onClick={() => router.push("/quan-ly")}
              >
                <LayoutDashboard size={16} />
                <Text fontSize="sm">Quản lý nhà hàng</Text>
              </Flex>
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
