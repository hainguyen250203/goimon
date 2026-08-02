"use client";

import { useState } from "react";
import { Box, Button, Circle, Float, Grid, HStack, IconButton, Text } from "@chakra-ui/react";
import { SlidersHorizontal, X } from "lucide-react";

import {
  DrawerActionTrigger,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerRoot,
} from "~/components/ui/drawer";
import { FilterFieldInput } from "./filter-field-input";
import { allFilterKeys, hasActiveFilterValues, type FilterField } from "./filter-field.type";

type FilterPatch = Record<string, string | undefined>;

/**
 * Nút "Bộ lọc" (icon + chữ) mở Drawer chứa field filter, lưới 2 cột — tham
 * khảo trực tiếp kiến trúc `FilterField[]` + `FilterPanel`/`FilterFieldInput`
 * của alix-bo-frontend-v2 (khai báo field 1 lần, component tự render đúng
 * control theo `field.type`), nhưng KHÔNG mang theo "active filter tags".
 * Draft chỉ commit (gọi `onApply`, trang tự build URL rồi `router.push`) khi
 * bấm "Áp dụng"; "Đặt lại" xoá toàn bộ field và áp dụng luôn.
 */
export function FilterDrawer({
  triggerLabel = "Bộ lọc",
  fields,
  values,
  defaults,
  onApply,
}: {
  triggerLabel?: string;
  fields: FilterField[];
  /** Giá trị filter đang áp dụng (từ URL), keyed theo `filterKeys(field)`. */
  values: Record<string, string>;
  /** Giá trị mặc định (vd "trong tháng") — field trùng default không tính là đang lọc. */
  defaults?: Record<string, string>;
  /** Patch phủ TOÀN BỘ key filter (giá trị hoặc undefined) — trang tự build URL rồi router.push. */
  onApply: (patch: FilterPatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterPatch>(values);

  // Đồng bộ lại draft từ giá trị đang áp dụng mỗi khi Drawer chuyển sang mở —
  // adjust ngay trong lúc render (không dùng effect), tránh nháy giao diện.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(values);
  }

  function patch(next: FilterPatch) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function commit(source: FilterPatch) {
    const keys = allFilterKeys(fields);
    const next: FilterPatch = {};
    for (const key of keys) next[key] = source[key] || undefined;
    onApply(next);
    setOpen(false);
  }

  const hasActiveFilters = hasActiveFilterValues(fields, values, defaults);

  return (
    <>
      <Box position="relative" display="inline-block">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <SlidersHorizontal size={16} />
          {triggerLabel}
        </Button>
        {hasActiveFilters && (
          <Float placement="top-end">
            <Circle size="2.5" bg="green.500" borderWidth="2px" borderColor="bg" />
          </Float>
        )}
      </Box>

      <DrawerRoot open={open} placement="end" onOpenChange={(e) => setOpen(e.open)}>
        <DrawerContent maxW={{ base: "full", sm: "380px" }}>
          <HStack justify="space-between" align="center" px={4} py={3} borderBottomWidth="1px" borderColor="border">
            <Text fontWeight="semibold" fontSize={{ base: "md", md: "lg" }}>
              {triggerLabel}
            </Text>
            <DrawerActionTrigger asChild>
              <IconButton aria-label="Đóng" variant="ghost" size="sm">
                <X size={16} />
              </IconButton>
            </DrawerActionTrigger>
          </HStack>

          <DrawerBody>
            <Grid templateColumns="repeat(2, 1fr)" gap={3} py={2}>
              {fields.map((field) => (
                <Box key={field.name} gridColumn={(field.size ?? 1) === 1 ? "span 1" : "span 2"}>
                  <FilterFieldInput field={field} values={draft as Record<string, string>} onChange={patch} />
                </Box>
              ))}
            </Grid>
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px" borderColor="border">
            <HStack w="full" gap={2}>
              <Button size="sm" variant="outline" onClick={() => commit({})}>
                Đặt lại
              </Button>
              <Button size="sm" flex={1} onClick={() => commit(draft)}>
                Áp dụng
              </Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </DrawerRoot>
    </>
  );
}
