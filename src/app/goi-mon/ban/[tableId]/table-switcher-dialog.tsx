"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { formatVnd } from "~/lib/format-order";

/** Đổi sang bàn khác ngay tại chỗ — tránh phải back về /goi-mon rồi chọn lại. */
export function TableSwitcherDialog({
  open,
  onOpenChange,
  currentTableId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTableId: number;
}) {
  const router = useRouter();
  const { data: areas } = api.table.listAreas.useQuery(undefined, { enabled: open });
  const { data: tables } = api.order.listTablesForOrdering.useQuery(undefined, { enabled: open });
  const [selectedAreaId, setSelectedAreaId] = useState<number>();

  const areaId = selectedAreaId ?? areas?.[0]?.id;
  const filteredTables = (tables ?? []).filter((t) => t.areaId === areaId);

  const handleSelect = (tableId: number) => {
    onOpenChange(false);
    if (tableId !== currentTableId) router.push(`/goi-mon/ban/${tableId}`);
  };

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent maxW={{ base: "calc(100vw - 24px)", sm: "480px" }} mx="auto">
        <DialogHeader>
          <DialogTitle>Đổi bàn</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <Flex gap={1.5} mb={3} overflowX="auto">
            {(areas ?? []).map((area) => {
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

          <Box maxH="50vh" overflowY="auto">
            <Grid templateColumns="repeat(4, 1fr)" gap={1.5}>
              {filteredTables.map((table) => {
                const occupied = table.activeOrder !== null;
                const isCurrent = table.id === currentTableId;
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
                    cursor="pointer"
                    colorPalette={occupied ? "blue" : "gray"}
                    bg={occupied ? "colorPalette.subtle" : "bg"}
                    borderWidth={isCurrent ? "2px" : "1px"}
                    borderColor={isCurrent ? "blue.solid" : occupied ? "colorPalette.emphasized" : "border"}
                    onClick={() => handleSelect(table.id)}
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
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
