"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";

import { api } from "~/trpc/react";

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function TableSelector({ areaId }: { areaId?: number }) {
  const router = useRouter();
  const [areas] = api.table.listAreas.useSuspenseQuery();
  const { data: tables } = api.order.listTablesForOrdering.useQuery(undefined, {
    // Nhiều nhân viên cùng thao tác trên các bàn — poll ngắn để tránh 2 người
    // cùng mở order 1 bàn đã có khách, không có hạ tầng realtime (socket).
    refetchInterval: 8000,
  });

  // Chưa chọn khu vực (hoặc khu vực trong URL không còn tồn tại) → mặc định khu vực đầu tiên.
  const activeAreaId = useMemo(() => {
    if (areaId && areas.some((a) => a.id === areaId)) return areaId;
    return areas[0]?.id;
  }, [areaId, areas]);

  useEffect(() => {
    if (activeAreaId && activeAreaId !== areaId) {
      router.replace(`/goi-mon?khuvuc=${activeAreaId}`);
    }
  }, [activeAreaId, areaId, router]);

  const filteredTables = (tables ?? []).filter((t) => t.areaId === activeAreaId);

  return (
    <Flex direction="column" flex={1} minH={0}>
      <Flex
        flexShrink={0}
        borderBottomWidth="1px"
        borderColor="border"
        bg="bg"
        p={{ base: 2, lg: 3 }}
        gap={{ base: 1.5, lg: 2 }}
        overflowX="auto"
      >
        {areas.map((area) => {
          const active = area.id === activeAreaId;
          return (
            <Box
              key={area.id}
              flexShrink={0}
              minW={{ base: "64px", lg: "90px" }}
              px={{ base: 2, lg: 3 }}
              py={{ base: 1.5, lg: 2 }}
              rounded="l2"
              textAlign="center"
              cursor="pointer"
              bg={active ? "colorPalette.subtle" : "bg.muted"}
              borderWidth="1px"
              borderColor={active ? "colorPalette.emphasized" : "border"}
              colorPalette={active ? "blue" : "gray"}
              onClick={() => router.push(`/goi-mon?khuvuc=${area.id}`)}
            >
              <Text
                fontSize={{ base: "2xs", lg: "xs" }}
                fontWeight={active ? "medium" : "normal"}
                color={active ? "colorPalette.fg" : "fg"}
              >
                {area.name}
              </Text>
            </Box>
          );
        })}
      </Flex>

      <Box flex={1} overflowY="auto" p={{ base: 2, lg: 3 }}>
        <Grid
          templateColumns={{ base: "repeat(3, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(6, 1fr)" }}
          gap={{ base: 2, lg: 3 }}
        >
          {filteredTables.map((table) => {
            const occupied = table.activeOrder !== null;
            return (
              <Flex
                key={table.id}
                aspectRatio={1}
                direction="column"
                align="center"
                justify="center"
                gap={0.5}
                p={{ base: 1.5, lg: 2 }}
                rounded="l2"
                cursor="pointer"
                colorPalette={occupied ? "teal" : "gray"}
                bg={occupied ? "colorPalette.subtle" : "bg"}
                borderWidth="1px"
                borderColor={occupied ? "colorPalette.emphasized" : "border"}
                onClick={() => router.push(`/goi-mon/ban/${table.id}`)}
              >
                <Text
                  fontSize={{ base: "xs", lg: "sm" }}
                  fontWeight="medium"
                  color={occupied ? "colorPalette.fg" : "fg"}
                >
                  {table.name}
                </Text>
                {table.activeOrder && (
                  <>
                    <Text fontSize={{ base: "2xs", lg: "xs" }} fontWeight="normal" color="colorPalette.fg">
                      {formatVnd(table.activeOrder.subtotal)}
                    </Text>
                    <Text fontSize="2xs" color="colorPalette.fg" display={{ base: "none", sm: "block" }}>
                      {formatTime(table.activeOrder.createdAt)}
                    </Text>
                  </>
                )}
              </Flex>
            );
          })}
        </Grid>

        {filteredTables.length === 0 && (
          <Flex h="200px" align="center" justify="center">
            <Text color="fg.muted" fontSize={{ base: "xs", lg: "sm" }}>
              Khu vực này chưa có bàn nào.
            </Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
