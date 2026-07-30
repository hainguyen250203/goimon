"use client";

import { useRouter } from "nextjs-toploader/app";
import { Flex, Input } from "@chakra-ui/react";

import { Field } from "~/components/ui/field";
import { api } from "~/trpc/react";
import { CategoryFilter } from "./ui/category-filter";

export function ReportFilters({
  start,
  end,
  categoryIds,
}: {
  start: string;
  end: string;
  /** Rỗng = không lọc (tính tất cả danh mục). */
  categoryIds: number[];
}) {
  const router = useRouter();
  const { data: categories } = api.menu.listCategories.useQuery();

  const navigate = (nextStart: string, nextEnd: string, nextCategoryIds: number[]) => {
    const params = new URLSearchParams({ start: nextStart, end: nextEnd });
    if (nextCategoryIds.length > 0) params.set("categories", nextCategoryIds.join(","));
    router.push(`/quan-ly/bao-cao?${params.toString()}`);
  };

  const allCategoryIds = (categories ?? []).map((c) => c.id);
  const displayedCategoryIds = categoryIds.length > 0 ? categoryIds : allCategoryIds;

  return (
    <Flex gap={3} wrap="wrap" align="end">
      <Field label="Từ ngày" maxW={{ base: "full", sm: "10rem" }}>
        <Input
          type="date"
          size="sm"
          value={start}
          max={end}
          onChange={(e) => e.target.value && navigate(e.target.value, end, categoryIds)}
        />
      </Field>
      <Field label="Đến ngày" maxW={{ base: "full", sm: "10rem" }}>
        <Input
          type="date"
          size="sm"
          value={end}
          min={start}
          onChange={(e) => e.target.value && navigate(start, e.target.value, categoryIds)}
        />
      </Field>
      <Field label="Danh mục món" maxW={{ base: "full", sm: "16rem" }}>
        <CategoryFilter
          categories={categories ?? []}
          selected={displayedCategoryIds}
          onChange={(ids) => {
            // Không cho bỏ chọn hết — báo cáo trống vô nghĩa.
            if (ids.length === 0) return;
            navigate(start, end, ids);
          }}
        />
      </Field>
    </Flex>
  );
}
