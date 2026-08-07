import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";

import { Skeleton } from "~/components/ui/skeleton";
import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { getDefaultReportRange } from "~/modules/report/application/get-default-report-range.usecase";
import { formatVNDateInputValue, toInclusiveEndDateInputValue, toQueryRange } from "~/lib/vn-date-range";
import { ReportView } from "./report-view";
import { ALL_REPORT_SECTIONS, SECTION_PERMISSION_KEY } from "./ui/report-section-picker";

export default async function BaoCaoPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; categories?: string }>;
}) {
  // Trang này cần riêng "bao-cao.get" — /quan-ly/layout.tsx chỉ chặn khi
  // KHÔNG có quyền quan-ly nào, nên phải tự chặn thêm ở đây (giống nguoi-dung).
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "bao-cao.get")) {
    redirect("/quan-ly");
  }
  // Mỗi phần trong trang Báo cáo có quyền riêng — tính ở đây (Server
  // Component, nơi duy nhất gọi được hasPermission) rồi truyền xuống, thay vì
  // để ReportView tự quyết định (Client Component không có session).
  const allowedSections = ALL_REPORT_SECTIONS.filter((section) =>
    hasPermission(permissions, SECTION_PERMISSION_KEY[section]),
  );

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
          <ReportView
            initialStart={initialStart}
            initialEnd={initialEnd}
            categoryIds={categoryIds}
            allowedSections={allowedSections}
          />
        </Suspense>
      </HydrateClient>
    </Box>
  );
}
