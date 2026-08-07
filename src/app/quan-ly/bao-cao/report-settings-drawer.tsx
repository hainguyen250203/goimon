"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Box, Button, Grid, HStack, IconButton, Input, Text } from "@chakra-ui/react";
import { Settings2, X } from "lucide-react";

import {
  DrawerActionTrigger,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerRoot,
} from "~/components/ui/drawer";
import { Field } from "~/components/ui/field";
import { api } from "~/trpc/react";
import { CategoryFilter } from "./ui/category-filter";
import { ReportSectionPicker } from "./ui/report-section-picker";
import type { ReportSectionKey } from "./ui/report-sections";

/**
 * Drawer điều khiển trang Báo cáo — layout copy từ
 * `src/components/data-table/filter-drawer.tsx` (Drawer 2 cột, trigger,
 * footer Đặt lại/Áp dụng) nhưng KHÔNG PHẢI filter: "Hiển thị phần báo cáo"
 * chỉ ẩn/hiện UI, không lọc dữ liệu, nên không gắn nhãn/icon "Bộ lọc" và
 * không có dot báo hiệu như `FilterDrawer`. Khoảng ngày/Danh mục món vẫn lưu
 * ở URL (`router.push`, y hệt `navigate()` cũ của report-filters.tsx đã xoá); Hiển
 * thị phần báo cáo lưu localStorage qua `onApplySections` (report-view.tsx
 * sở hữu state đó, xem useLocalStorageState).
 */
export function ReportSettingsDrawer({
  start,
  end,
  categoryIds,
  visibleSections,
  onApplySections,
  allowedSections,
}: {
  start: string;
  end: string;
  /** Rỗng = không lọc (tính tất cả danh mục). */
  categoryIds: number[];
  visibleSections: ReportSectionKey[];
  onApplySections: (sections: ReportSectionKey[]) => void;
  /** Phần role có quyền xem — giới hạn option của ReportSectionPicker và là
   * giá trị "Đặt lại" (không dùng ALL_REPORT_SECTIONS nữa vì có thể có phần
   * role không có quyền). */
  allowedSections: ReportSectionKey[];
}) {
  const router = useRouter();
  const { data: categories } = api.menu.listCategories.useQuery();
  const [open, setOpen] = useState(false);

  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [draftCategoryIds, setDraftCategoryIds] = useState(categoryIds);
  const [draftSections, setDraftSections] = useState(visibleSections);

  // Đồng bộ lại draft từ giá trị đang áp dụng mỗi khi Drawer chuyển sang mở —
  // adjust ngay trong lúc render (không dùng effect), tránh nháy giao diện.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDraftStart(start);
      setDraftEnd(end);
      setDraftCategoryIds(categoryIds);
      setDraftSections(visibleSections);
    }
  }

  const allCategoryIds = (categories ?? []).map((c) => c.id);
  const displayedCategoryIds = draftCategoryIds.length > 0 ? draftCategoryIds : allCategoryIds;

  function handleApply() {
    const params = new URLSearchParams({ start: draftStart, end: draftEnd });
    if (draftCategoryIds.length > 0) params.set("categories", draftCategoryIds.join(","));
    router.push(`/quan-ly/bao-cao?${params.toString()}`);
    onApplySections(draftSections);
    setOpen(false);
  }

  function handleReset() {
    router.push("/quan-ly/bao-cao");
    onApplySections(allowedSections);
    setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Settings2 size={16} />
        Tuỳ chỉnh báo cáo
      </Button>

      <DrawerRoot open={open} placement="end" onOpenChange={(e) => setOpen(e.open)}>
        <DrawerContent maxW={{ base: "full", sm: "380px" }}>
          <HStack justify="space-between" align="center" px={4} py={3} borderBottomWidth="1px" borderColor="border">
            <Text fontWeight="semibold" fontSize={{ base: "md", md: "lg" }}>
              Tuỳ chỉnh báo cáo
            </Text>
            <DrawerActionTrigger asChild>
              <IconButton aria-label="Đóng" variant="ghost" size="sm">
                <X size={16} />
              </IconButton>
            </DrawerActionTrigger>
          </HStack>

          <DrawerBody>
            <Grid templateColumns="repeat(2, 1fr)" gap={3} py={2}>
              <Box gridColumn="span 2">
                <Field label="Khoảng ngày">
                  <Grid templateColumns="1fr 1fr" gap={2} w="full">
                    <Input
                      type="date"
                      size="sm"
                      aria-label="Từ ngày"
                      value={draftStart}
                      max={draftEnd}
                      onChange={(e) => e.target.value && setDraftStart(e.target.value)}
                    />
                    <Input
                      type="date"
                      size="sm"
                      aria-label="Đến ngày"
                      value={draftEnd}
                      min={draftStart}
                      onChange={(e) => e.target.value && setDraftEnd(e.target.value)}
                    />
                  </Grid>
                </Field>
              </Box>

              <Box gridColumn="span 2">
                <Field label="Danh mục món">
                  <CategoryFilter
                    categories={categories ?? []}
                    selected={displayedCategoryIds}
                    onChange={(ids) => {
                      // Không cho bỏ chọn hết — báo cáo trống vô nghĩa.
                      if (ids.length === 0) return;
                      setDraftCategoryIds(ids);
                    }}
                  />
                </Field>
              </Box>

              <Box gridColumn="span 2">
                <Field label="Hiển thị phần báo cáo">
                  <ReportSectionPicker
                    selected={draftSections}
                    onChange={setDraftSections}
                    allowedSections={allowedSections}
                  />
                </Field>
              </Box>
            </Grid>
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px" borderColor="border">
            <HStack w="full" gap={2}>
              <Button size="sm" variant="outline" onClick={handleReset}>
                Đặt lại
              </Button>
              <Button size="sm" flex={1} onClick={handleApply}>
                Áp dụng
              </Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </DrawerRoot>
    </>
  );
}
