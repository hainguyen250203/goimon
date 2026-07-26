"use client";

import { usePathname, useRouter } from "next/navigation";
import { Flex, Text } from "@chakra-ui/react";
import { LayoutGrid, Store } from "lucide-react";

/**
 * Tham khảo BottomNav của pos-fe: thanh điều hướng dưới cùng, 2 tab đều
 * "Khu vực" (chọn bàn/gọi món) và "Cửa hàng" (thông tin tài khoản, đăng
 * xuất) — thay cho avatar dropdown trước đây.
 */
export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const isTableActive = pathname === "/goi-mon" || pathname.startsWith("/goi-mon/ban");
  const isStoreActive = pathname.startsWith("/goi-mon/cua-hang");

  return (
    <Flex
      as="footer"
      flexShrink={0}
      h="56px"
      bg="bg"
      borderTopWidth="1px"
      borderColor="border"
    >
      <Flex
        flex={1}
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

      <Flex
        flex={1}
        direction="column"
        align="center"
        justify="center"
        gap={0.5}
        cursor="pointer"
        colorPalette={isStoreActive ? "blue" : "gray"}
        onClick={() => router.push("/goi-mon/cua-hang")}
      >
        <Store
          size={20}
          color={isStoreActive ? "var(--chakra-colors-blue-fg)" : "var(--chakra-colors-fg-muted)"}
        />
        <Text
          fontSize="xs"
          fontWeight={isStoreActive ? "semibold" : "medium"}
          color={isStoreActive ? "colorPalette.fg" : "fg.muted"}
        >
          Cửa hàng
        </Text>
      </Flex>
    </Flex>
  );
}
