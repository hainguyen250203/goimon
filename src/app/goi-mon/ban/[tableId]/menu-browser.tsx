"use client";

import { useMemo, useState } from "react";
import { Box, Flex, Grid, IconButton, Input, Text } from "@chakra-ui/react";
import { X } from "lucide-react";

import { api } from "~/trpc/react";
import { stripDiacritics } from "~/lib/text";
import { formatVnd } from "~/lib/format-order";
import { useOrderCartStore } from "../../order-cart.store";

const ALL_CATEGORY = 0;

/**
 * Tab "Chọn món" trong trang gộp của 1 bàn — không còn header riêng (header
 * dùng chung ở OrderTableView), không còn thanh "N món · Tạm tính" (dư thừa
 * với tab "Đang gọi" đã hiện sẵn badge số món + tổng tiền ngay khi mở tab đó).
 */
export function MenuBrowserPanel({ tableId }: { tableId: number }) {
  const [menuItems] = api.menu.listForOrdering.useSuspenseQuery();

  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_CATEGORY);
  const [search, setSearch] = useState("");

  const addItem = useOrderCartStore((s) => s.addItem);

  const categories = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of menuItems) map.set(item.categoryId, item.categoryName);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [menuItems]);

  // Tính sẵn tên đã bỏ dấu 1 LẦN khi menuItems load xong — filteredItems gõ
  // xuống dòng dưới sẽ chạy lại mỗi keystroke, không nên strip lại toàn bộ
  // danh sách mỗi lần gõ (vô ích vì tên món không đổi giữa các lần gõ).
  const normalizedNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of menuItems) map.set(item.id, stripDiacritics(item.name.toLowerCase()));
    return map;
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    // Gõ không dấu (vd "ga") vẫn tìm ra món có dấu (vd "Gà") — bỏ dấu cả 2
    // vế trước khi so khớp.
    const normalizedSearch = stripDiacritics(search.toLowerCase());
    return menuItems.filter((item) => {
      if (selectedCategoryId !== ALL_CATEGORY && item.categoryId !== selectedCategoryId) {
        return false;
      }
      return normalizedNameById.get(item.id)!.includes(normalizedSearch);
    });
  }, [menuItems, selectedCategoryId, search, normalizedNameById]);

  return (
    <Flex direction="column" flex={1} minH={0}>
      <Box flexShrink={0} bg="bg" borderBottomWidth="1px" borderColor="border" p={{ base: 2, lg: 3 }}>
        <Box position="relative">
          <Input
            placeholder="Tìm món"
            size={{ base: "xs", lg: "sm" }}
            pr={search ? 8 : undefined}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <IconButton
              aria-label="Xoá tìm kiếm"
              size="xs"
              variant="ghost"
              position="absolute"
              right={1}
              top="50%"
              transform="translateY(-50%)"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </IconButton>
          )}
        </Box>
      </Box>

      <Flex flex={1} minH={0} overflow="hidden">
        <Box
          w={{ base: "88px", lg: "110px" }}
          flexShrink={0}
          bg="bg.muted"
          borderRightWidth="1px"
          borderColor="border"
          overflowY="auto"
        >
          <Flex direction="column" gap={0} p={1}>
            <Box
              px={{ base: 1.5, lg: 2 }}
              py={{ base: 2, lg: 2.5 }}
              rounded="l3"
              cursor="pointer"
              textAlign="center"
              bg={selectedCategoryId === ALL_CATEGORY ? "blue.subtle" : "transparent"}
              onClick={() => setSelectedCategoryId(ALL_CATEGORY)}
            >
              <Text
                fontSize={{ base: "2xs", lg: "xs" }}
                fontWeight={selectedCategoryId === ALL_CATEGORY ? "semibold" : "medium"}
                color={selectedCategoryId === ALL_CATEGORY ? "blue.fg" : "fg"}
              >
                Tất cả
              </Text>
            </Box>
            {categories.map((category) => {
              const active = selectedCategoryId === category.id;
              return (
                <Box
                  key={category.id}
                  px={{ base: 1.5, lg: 2 }}
                  py={{ base: 2, lg: 2.5 }}
                  rounded="l3"
                  cursor="pointer"
                  textAlign="center"
                  bg={active ? "blue.subtle" : "transparent"}
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  <Text
                    fontSize={{ base: "2xs", lg: "xs" }}
                    fontWeight={active ? "semibold" : "medium"}
                    color={active ? "blue.fg" : "fg"}
                  >
                    {category.name}
                  </Text>
                </Box>
              );
            })}
          </Flex>
        </Box>

        <Box flex={1} overflowY="auto" p={{ base: 2, lg: 3 }}>
          <Grid
            templateColumns={{ base: "repeat(3, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(5, 1fr)", lg: "repeat(6, 1fr)" }}
            gap={{ base: 1.5, lg: 2 }}
          >
            {filteredItems.map((item) => (
              <Flex
                key={item.id}
                direction="column"
                justify="space-between"
                gap={2}
                minH={{ base: "72px", lg: "84px" }}
                bg="bg"
                borderWidth="1px"
                borderColor="border"
                rounded="l3"
                p={{ base: 2, lg: 2.5 }}
                cursor={item.isAvailable ? "pointer" : "not-allowed"}
                opacity={item.isAvailable ? 1 : 0.5}
                _hover={item.isAvailable ? { borderColor: "blue.solid" } : undefined}
                onClick={() =>
                  item.isAvailable &&
                  addItem(tableId, { menuItemId: item.id, name: item.name, price: item.price })
                }
              >
                <Text fontSize={{ base: "2xs", lg: "xs" }} fontWeight="semibold" lineClamp={2}>
                  {item.name}
                </Text>
                <Flex align="center" justify="space-between" gap={1}>
                  <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="bold" color="blue.fg">
                    {formatVnd(item.price)}
                  </Text>
                  {!item.isAvailable && (
                    <Text fontSize={{ base: "2xs", lg: "xs" }} color="red.fg" fontWeight="medium">
                      Hết món
                    </Text>
                  )}
                </Flex>
              </Flex>
            ))}
          </Grid>

          {filteredItems.length === 0 && (
            <Flex h="160px" align="center" justify="center">
              <Text color="fg.muted" fontSize={{ base: "xs", lg: "sm" }}>
                Không tìm thấy món.
              </Text>
            </Flex>
          )}
        </Box>
      </Flex>
    </Flex>
  );
}
