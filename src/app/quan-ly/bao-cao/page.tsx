import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";

import { Skeleton } from "~/components/ui/skeleton";
import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { getDefaultReportRange } from "~/modules/report/application/get-default-report-range.usecase";
import { formatVNDateInputValue, toInclusiveEndDateInputValue, toQueryRange } from "./date-range";
import { ReportView } from "./report-view";

export default async function BaoCaoPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; categories?: string }>;
}) {
  // Trang này admin-only — /quan-ly/layout.tsx chỉ chặn role "user", không
  // phân biệt manager/admin, nên phải tự chặn thêm ở đây (giống nguoi-dung).
  const session = await getSession();
  if (session?.user.role !== "admin") {
    redirect("/quan-ly");
  }

  const { start: startParam, end: endParam, categories: categoriesParam } = await searchParams;
  const categoryIds = categoriesParam
    ? categoriesParam
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
    : [];

  let initialStart: string;
  let initialEnd: string;
  let start: Date;
  let end: Date;

  if (startParam && endParam) {
    initialStart = startParam;
    initialEnd = endParam;
    ({ start, end } = toQueryRange(startParam, endParam));
  } else {
    // Tính mặc định NGAY TRÊN SERVER (không phải client) — tránh lệch giờ/
    // hydration mismatch giữa server-client khi phụ thuộc "hôm nay".
    const defaultRange = getDefaultReportRange();
    start = defaultRange.start;
    end = defaultRange.end;
    initialStart = formatVNDateInputValue(start);
    initialEnd = toInclusiveEndDateInputValue(end);
  }

  void api.report.getReport.prefetch({
    start,
    end,
    categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
  });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
        <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
          <ReportView initialStart={initialStart} initialEnd={initialEnd} categoryIds={categoryIds} />
        </Suspense>
      </HydrateClient>
    </Box>
  );
}
