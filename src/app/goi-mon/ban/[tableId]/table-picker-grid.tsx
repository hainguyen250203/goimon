"use client";

import { useMemo, useState } from "react";
import { Box, Flex, Grid, IconButton, Text, useBreakpointValue } from "@chakra-ui/react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

import { formatVnd } from "~/lib/format-order";
import type { AreaOption } from "~/modules/table/domain/restaurant-table.repository";
import type { TableForOrdering } from "~/modules/table/domain/restaurant-table.entity";

const ROWS_PER_PAGE = 4;

/**
 * Rail khu vực + lưới ô bàn — phần UI chọn bàn dùng chung cho 2 tính năng
 * KHÁC NHAU: TableSwitcherDialog (điều hướng xem/gọi món bàn khác, không đụng
 * đơn) và MoveOrderTableDialog (chuyển thật đơn đang phục vụ sang bàn khác).
 * Chỉ dùng chung phần "chọn 1 bàn từ lưới" — logic khi CHỌN xong khác nhau
 * hoàn toàn nên để 2 dialog gọi component riêng, không gộp thành 1 dialog.
 *
 * Cả hàng khu vực lẫn lưới bàn đều phân trang bằng nút mũi tên thay vì cuộn —
 * tránh thanh cuộn lồng bên trong dialog (xấu, dễ "cuộn lố" ra ngoài).
 */
export function TablePickerGrid({
  areas,
  tables,
  currentTableId,
  isTableDisabled,
  onSelectTable,
  disabled,
}: {
  areas: AreaOption[];
  tables: TableForOrdering[];
  currentTableId: number;
  isTableDisabled?: (table: TableForOrdering) => boolean;
  onSelectTable: (tableId: number) => void;
  /** Khoá cả lưới — dùng khi đang mutate HOẶC khi chưa đủ điều kiện chọn bàn (vd chưa chọn món nào cần chuyển), không chỉ khi "đang bận". */
  disabled?: boolean;
}) {
  const [selectedAreaId, setSelectedAreaId] = useState<number>();
  const [areaPageRaw, setAreaPageRaw] = useState(0);
  const [tablePageRaw, setTablePageRaw] = useState(0);

  const areaId = selectedAreaId ?? areas[0]?.id;
  const filteredTables = tables.filter((t) => t.areaId === areaId);

  // Khu vực nào đang có ít nhất 1 bàn mở đơn — chấm tròn trên tab khu vực,
  // đúng logic đã có ở table-selector.tsx (trang /goi-mon chính) để nhận
  // biết nhanh không cần bấm vào từng khu mới biết có khách hay chưa.
  const areasWithOpenOrder = useMemo(() => {
    const set = new Set<number>();
    for (const t of tables) {
      if (t.activeOrder) set.add(t.areaId);
    }
    return set;
  }, [tables]);

  const areasPerPage = useBreakpointValue({ base: 4, lg: 6 }) ?? 4;
  const totalAreaPages = Math.max(1, Math.ceil(areas.length / areasPerPage));
  const areaPage = Math.min(areaPageRaw, totalAreaPages - 1);
  const visibleAreas = areas.slice(areaPage * areasPerPage, areaPage * areasPerPage + areasPerPage);

  const columns = useBreakpointValue({ base: 4, lg: 5 }) ?? 4;
  const tablesPerPage = columns * ROWS_PER_PAGE;
  const totalTablePages = Math.max(1, Math.ceil(filteredTables.length / tablesPerPage));
  const tablePage = Math.min(tablePageRaw, totalTablePages - 1);
  const visibleTables = filteredTables.slice(tablePage * tablesPerPage, tablePage * tablesPerPage + tablesPerPage);

  const selectArea = (id: number) => {
    setSelectedAreaId(id);
    setTablePageRaw(0);
  };

  return (
    <>
      <Flex align="center" gap={1} mb={3}>
        <IconButton
          size="xs"
          variant="ghost"
          aria-label="Khu vực trước"
          disabled={areaPage === 0}
          onClick={() => setAreaPageRaw((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft size={16} />
        </IconButton>
        <Flex flex={1} gap={1.5} justify="center" wrap="wrap">
          {visibleAreas.map((area) => {
            const active = area.id === areaId;
            return (
              <Box
                key={area.id}
                position="relative"
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
                onClick={() => selectArea(area.id)}
              >
                <Text
                  fontSize="xs"
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
          onClick={() => setAreaPageRaw((p) => Math.min(totalAreaPages - 1, p + 1))}
        >
          <ChevronRight size={16} />
        </IconButton>
      </Flex>

      <Box opacity={disabled ? 0.6 : 1} pointerEvents={disabled ? "none" : "auto"}>
        <Grid templateColumns={{ base: "repeat(4, 1fr)", lg: "repeat(5, 1fr)" }} gap={1.5}>
          {visibleTables.map((table) => {
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

        {totalTablePages > 1 && (
          <Flex align="center" justify="center" gap={2} mt={3}>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Trang bàn trước"
              disabled={tablePage === 0}
              onClick={() => setTablePageRaw((p) => Math.max(0, p - 1))}
            >
              <ChevronUp size={16} />
            </IconButton>
            <Text fontSize="xs" color="fg.muted">
              Trang {tablePage + 1}/{totalTablePages}
            </Text>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Trang bàn sau"
              disabled={tablePage >= totalTablePages - 1}
              onClick={() => setTablePageRaw((p) => Math.min(totalTablePages - 1, p + 1))}
            >
              <ChevronDown size={16} />
            </IconButton>
          </Flex>
        )}
      </Box>
    </>
  );
}
