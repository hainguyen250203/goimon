"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Box, Flex, Grid, IconButton, Text, useBreakpointValue } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { api } from "~/trpc/react";
import { formatVnd } from "~/lib/format-order";

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

  // Khu vực nào đang có ít nhất 1 bàn mở đơn — chấm tròn trên tab khu vực để
  // nhận biết nhanh không cần bấm vào từng khu mới biết có khách hay chưa.
  const areasWithOpenOrder = useMemo(() => {
    const set = new Set<number>();
    for (const t of tables ?? []) {
      if (t.activeOrder) set.add(t.areaId);
    }
    return set;
  }, [tables]);

  const areasPerPage = useBreakpointValue({ base: 4, sm: 5, md: 6, lg: 7, xl: 10 }) ?? 4;
  const totalAreaPages = Math.max(1, Math.ceil(areas.length / areasPerPage));

  // Trang mặc định luôn là trang CHỨA khu vực đang chọn (vd quay lại từ 1 bàn
  // ở Khu 8 thì hàng khu vực phải tự lật sang trang có Khu 8, không bắt bấm
  // lại nút "sang" mới thấy). `areaPageOverride` chỉ dùng khi người dùng chủ
  // động bấm mũi tên để LƯỚT xem các khu khác mà chưa chọn — reset về null
  // (dùng lại trang mặc định) ngay khi activeAreaId đổi.
  const activeAreaIndex = areas.findIndex((a) => a.id === activeAreaId);
  const defaultAreaPage = activeAreaIndex >= 0 ? Math.floor(activeAreaIndex / areasPerPage) : 0;
  const [areaPageOverride, setAreaPageOverride] = useState<number | null>(null);
  useEffect(() => {
    setAreaPageOverride(null);
  }, [activeAreaId]);

  const areaPage = Math.min(areaPageOverride ?? defaultAreaPage, totalAreaPages - 1);
  const visibleAreas = areas.slice(areaPage * areasPerPage, areaPage * areasPerPage + areasPerPage);

  const selectArea = (id: number) => {
    router.push(`/goi-mon?khuvuc=${id}`);
  };

  return (
    <Flex direction="column" flex={1} minH={0}>
      <Flex
        flexShrink={0}
        align="center"
        borderBottomWidth="1px"
        borderColor="border"
        bg="bg"
        p={{ base: 2, lg: 3 }}
        gap={{ base: 1, lg: 1.5 }}
      >
        <IconButton
          size="xs"
          variant="ghost"
          aria-label="Khu vực trước"
          disabled={areaPage === 0}
          onClick={() => setAreaPageOverride(Math.max(0, areaPage - 1))}
        >
          <ChevronLeft size={16} />
        </IconButton>
        <Flex flex={1} gap={{ base: 1.5, lg: 2 }} justify="center" wrap="wrap">
          {visibleAreas.map((area) => {
            const active = area.id === activeAreaId;
            return (
              <Box
                key={area.id}
                position="relative"
                flexShrink={0}
                minW={{ base: "64px", lg: "90px" }}
                px={{ base: 2, lg: 3 }}
                py={{ base: 1.5, lg: 2 }}
                rounded="l3"
                textAlign="center"
                cursor="pointer"
                bg={active ? "colorPalette.subtle" : "bg.muted"}
                borderWidth="1px"
                borderColor={active ? "colorPalette.emphasized" : "border"}
                colorPalette={active ? "blue" : "gray"}
                onClick={() => selectArea(area.id)}
              >
                <Text
                  fontSize={{ base: "2xs", lg: "xs" }}
                  fontWeight={active ? "medium" : "normal"}
                  color={active ? "colorPalette.fg" : "fg"}
                >
                  {area.name}
                </Text>
                {areasWithOpenOrder.has(area.id) && (
                  <Box
                    position="absolute"
                    top="-3px"
                    right="-3px"
                    boxSize="10px"
                    rounded="full"
                    bg="orange.solid"
                    borderWidth="2px"
                    borderColor="bg"
                  />
                )}
              </Box>
            );
          })}
        </Flex>
        <IconButton
          size="xs"
          variant="ghost"
          aria-label="Khu vực tiếp theo"
          disabled={areaPage >= totalAreaPages - 1}
          onClick={() => setAreaPageOverride(Math.min(totalAreaPages - 1, areaPage + 1))}
        >
          <ChevronRight size={16} />
        </IconButton>
      </Flex>

      <Box flex={1} overflowY="auto" p={{ base: 2, lg: 3 }}>
        <Grid
          templateColumns={{ base: "repeat(4, 1fr)", sm: "repeat(5, 1fr)", md: "repeat(7, 1fr)" }}
          gap={{ base: 1.5, lg: 2 }}
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
                p={{ base: 1, lg: 1.5 }}
                rounded="l3"
                cursor="pointer"
                colorPalette={occupied ? "blue" : "gray"}
                bg={occupied ? "colorPalette.subtle" : "bg"}
                borderWidth="1px"
                borderColor={occupied ? "colorPalette.emphasized" : "border"}
                onClick={() => router.push(`/goi-mon/ban/${table.id}`)}
              >
                <Text
                  fontSize={{ base: "xs", lg: "sm" }}
                  fontWeight="semibold"
                  color={occupied ? "colorPalette.fg" : "fg"}
                >
                  {table.name}
                </Text>
                {table.activeOrder && (
                  <>
                    <Text fontSize={{ base: "2xs", lg: "xs" }} fontWeight="normal" color="colorPalette.fg">
                      {formatVnd(table.activeOrder.subtotal)}
                    </Text>
                    <Text
                      fontSize={{ base: "2xs", lg: "xs" }}
                      color="colorPalette.fg"
                      display={{ base: "none", sm: "block" }}
                    >
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
