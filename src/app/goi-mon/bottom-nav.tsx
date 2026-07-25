"use client";

import { usePathname, useRouter } from "next/navigation";
import { Flex, Text } from "@chakra-ui/react";
import { LayoutGrid } from "lucide-react";

import { NavUser } from "~/components/layout/nav-user";

/**
 * Tham khảo BottomNav của pos-fe (thanh điều hướng dưới cùng, 2 tab: Khu vực
 * / Cửa hàng) — hiện chỉ làm tab "Khu vực" (chọn bàn), tab thứ 2 để dành cho
 * task sau. Gộp avatar/đăng xuất vào luôn thanh này thay vì header riêng
 * (pos-fe không có header, đặt logout trong tab "Cửa hàng" — goimon chưa có
 * tab đó nên tạm gộp ở đây cho có chỗ đăng xuất).
 */
export function BottomNav({
  user,
}: {
  user: { name: string; role: string; phoneNumber?: string | null };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isTableActive = pathname.startsWith("/goi-mon");

  return (
    <Flex
      as="footer"
      flexShrink={0}
      h="56px"
      align="center"
      justify="space-between"
      px={2}
      bg="bg"
      borderTopWidth="1px"
      borderColor="border"
    >
      <Flex
        flex={1}
        h="full"
        direction="column"
        align="center"
        justify="center"
        gap={0.5}
        cursor="pointer"
        colorPalette={isTableActive ? "blue" : "gray"}
        onClick={() => router.push("/goi-mon")}
      >
        <LayoutGrid
          size={20}
          color={isTableActive ? "var(--chakra-colors-blue-fg)" : "var(--chakra-colors-fg-muted)"}
        />
        <Text
          fontSize="xs"
          fontWeight={isTableActive ? "semibold" : "medium"}
          color={isTableActive ? "colorPalette.fg" : "fg.muted"}
        >
          Khu vực
        </Text>
      </Flex>

      <NavUser user={user} />
    </Flex>
  );
}
