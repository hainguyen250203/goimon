"use client";

import { useState } from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";

import { formatVnd } from "~/lib/format-order";
import type { AreaOption } from "~/modules/table/domain/restaurant-table.repository";
import type { TableForOrdering } from "~/modules/table/domain/restaurant-table.entity";

/**
 * Rail khu vực + lưới ô bàn — phần UI chọn bàn dùng chung cho 2 tính năng
 * KHÁC NHAU: TableSwitcherDialog (điều hướng xem/gọi món bàn khác, không đụng
 * đơn) và MoveOrderTableDialog (chuyển thật đơn đang phục vụ sang bàn khác).
 * Chỉ dùng chung phần "chọn 1 bàn từ lưới" — logic khi CHỌN xong khác nhau
 * hoàn toàn nên để 2 dialog gọi component riêng, không gộp thành 1 dialog.
 */
export function TablePickerGrid({
  areas,
  tables,
  currentTableId,
  isTableDisabled,
  onSelectTable,
  busy,
}: {
  areas: AreaOption[];
  tables: TableForOrdering[];
  currentTableId: number;
  isTableDisabled?: (table: TableForOrdering) => boolean;
  onSelectTable: (tableId: number) => void;
  busy?: boolean;
}) {
  const [selectedAreaId, setSelectedAreaId] = useState<number>();
  const areaId = selectedAreaId ?? areas[0]?.id;
  const filteredTables = tables.filter((t) => t.areaId === areaId);

  return (
    <>
      <Flex gap={1.5} mb={3} overflowX="auto">
        {areas.map((area) => {
          const active = area.id === areaId;
          return (
            <Box
              key={area.id}
              flexShrink={0}
              px={3}
              py={1.5}
              rounded="l3"
              cursor="pointer"
              textAlign="center"
              bg={active ? "colorPalette.subtle" : "bg.muted"}
              borderWidth="1px"
              borderColor={active ? "colorPalette.emphasized" : "border"}
              colorPalette={active ? "blue" : "gray"}
              onClick={() => setSelectedAreaId(area.id)}
            >
              <Text
                fontSize="xs"
                fontWeight={active ? "medium" : "normal"}
                color={active ? "colorPalette.fg" : "fg"}
              >
                {area.name}
              </Text>
            </Box>
          );
        })}
      </Flex>

      <Box maxH="50vh" overflowY="auto" opacity={busy ? 0.6 : 1} pointerEvents={busy ? "none" : "auto"}>
        <Grid templateColumns={{ base: "repeat(4, 1fr)", lg: "repeat(5, 1fr)" }} gap={1.5}>
          {filteredTables.map((table) => {
            const occupied = table.activeOrder !== null;
            const isCurrent = table.id === currentTableId;
            const disabled = !isCurrent && (isTableDisabled?.(table) ?? false);
            return (
              <Flex
                key={table.id}
                aspectRatio={1}
                direction="column"
                align="center"
                justify="center"
                gap={0.5}
                p={1}
                rounded="l3"
                cursor={disabled ? "not-allowed" : "pointer"}
                opacity={disabled ? 0.5 : 1}
                colorPalette={occupied ? "blue" : "gray"}
                bg={occupied ? "colorPalette.subtle" : "bg"}
                borderWidth={isCurrent ? "2px" : "1px"}
                borderColor={isCurrent ? "blue.solid" : occupied ? "colorPalette.emphasized" : "border"}
                onClick={disabled ? undefined : () => onSelectTable(table.id)}
              >
                <Text fontSize="xs" fontWeight="semibold" color={occupied ? "colorPalette.fg" : "fg"}>
                  {table.name}
                </Text>
                {table.activeOrder && (
                  <Text fontSize="2xs" color="colorPalette.fg">
                    {formatVnd(table.activeOrder.subtotal)}
                  </Text>
                )}
              </Flex>
            );
          })}
        </Grid>

        {filteredTables.length === 0 && (
          <Flex h="120px" align="center" justify="center">
            <Text color="fg.muted" fontSize="sm">
              Khu vực này chưa có bàn nào.
            </Text>
          </Flex>
        )}
      </Box>
    </>
  );
}
