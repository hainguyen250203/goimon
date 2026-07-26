"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Grid, IconButton, Input, Text } from "@chakra-ui/react";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { api } from "~/trpc/react";
import { stripDiacritics } from "~/lib/text";
import {
  useOrderCartStore,
  getCartTotalAmount,
  getCartTotalItems,
  EMPTY_DRAFT_ITEMS,
} from "../../order-cart.store";

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

const ALL_CATEGORY = 0;

export function MenuBrowser({ tableId }: { tableId: number }) {
  const router = useRouter();
  const [menuItems] = api.menu.listForOrdering.useSuspenseQuery();
  const [tables] = api.order.listTablesForOrdering.useSuspenseQuery();
  const table = tables.find((t) => t.id === tableId);

  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_CATEGORY);
  const [search, setSearch] = useState("");

  const addItem = useOrderCartStore((s) => s.addItem);
  const draftItems = useOrderCartStore((s) => s.draftCarts[tableId] ?? EMPTY_DRAFT_ITEMS);
  const totalItems = getCartTotalItems(draftItems);
  const totalAmount = getCartTotalAmount(draftItems);

  const categories = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of menuItems) map.set(item.categoryId, item.categoryName);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    // Gõ không dấu (vd "ga") vẫn tìm ra món có dấu (vd "Gà") — bỏ dấu cả 2
    // vế trước khi so khớp.
    const normalizedSearch = stripDiacritics(search.toLowerCase());
    return menuItems.filter((item) => {
      if (selectedCategoryId !== ALL_CATEGORY && item.categoryId !== selectedCategoryId) {
        return false;
      }
      return stripDiacritics(item.name.toLowerCase()).includes(normalizedSearch);
    });
  }, [menuItems, selectedCategoryId, search]);

  return (
    <Flex direction="column" flex={1} minH={0}>
      <Box flexShrink={0} bg="bg" borderBottomWidth="1px" borderColor="border" p={{ base: 2, lg: 3 }}>
        <Flex align="center" gap={2} mb={{ base: 2, lg: 3 }}>
          <IconButton
            aria-label="Quay lại"
            size={{ base: "xs", lg: "sm" }}
            variant="ghost"
            onClick={() => router.push("/goi-mon")}
          >
            <ArrowLeft />
          </IconButton>
          <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="semibold">
            {table?.name ?? `Bàn ${tableId}`}
          </Text>
        </Flex>

        <Input
          placeholder="Tìm món"
          size={{ base: "xs", lg: "sm" }}
          mb={{ base: 2, lg: 3 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Flex
          bg="colorPalette.solid"
          color="colorPalette.contrast"
          colorPalette="blue"
          p={{ base: 2, lg: 2.5 }}
          rounded="l2"
          align="center"
          justify="space-between"
          cursor="pointer"
          onClick={() => router.push(`/goi-mon/ban/${tableId}/don`)}
        >
          <Text fontSize={{ base: "2xs", lg: "xs" }} fontWeight="medium">
            {totalItems} món · Tạm tính
          </Text>
          <Flex align="center" gap={1}>
            <Text fontSize={{ base: "xs", lg: "sm" }} fontWeight="bold">
              {formatVnd(totalAmount)}
            </Text>
            <ChevronRight size={16} />
          </Flex>
        </Flex>
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
              rounded="l2"
              cursor="pointer"
              textAlign="center"
              bg={selectedCategoryId === ALL_CATEGORY ? "bg" : "transparent"}
              borderLeftWidth="3px"
              borderLeftColor={selectedCategoryId === ALL_CATEGORY ? "blue.solid" : "transparent"}
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
                  rounded="l2"
                  cursor="pointer"
                  textAlign="center"
                  bg={active ? "bg" : "transparent"}
                  borderLeftWidth="3px"
                  borderLeftColor={active ? "blue.solid" : "transparent"}
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
            templateColumns={{ base: "repeat(3, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(5, 1fr)" }}
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
                rounded="l2"
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
                    <Text fontSize="2xs" color="red.fg" fontWeight="medium">
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
