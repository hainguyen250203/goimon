import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { parsePageSize } from "~/lib/pagination";
import {
  endOfVNDayExclusive,
  formatVNDateInputValue,
  getDefaultVNMonthRange,
  parseVNDateInputValue,
  toInclusiveEndDateInputValue,
} from "~/lib/vn-date-range";
import { ActivityLogList } from "./activity-log-list";

export default async function NhatKyHoatDongPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    entityType?: string;
    actorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  // /quan-ly/layout.tsx chỉ chặn role "user" — route này CHỈ superadmin (list
  // dùng superadminProcedure), admin không còn xem được nữa (khác các trang
  // admin-only khác — đây là 1 trong số ít trang cần THU HẸP thay vì mở rộng,
  // xem CLAUDE.md). Không chặn thì admin vẫn vào được UI nhưng gọi tRPC
  // FORBIDDEN, kẹt loading vô thời hạn thay vì bị chặn rõ ràng.
  const session = await getSession();
  if (session?.user.role !== "superadmin") {
    redirect("/quan-ly");
  }

  const {
    page: pageParam,
    pageSize: pageSizeParam,
    entityType,
    actorId,
    dateFrom,
    dateTo,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);

  // "Từ ngày"/"Đến ngày" là 2 field độc lập (không bắt buộc đi cùng cặp) —
  // URL chỉ giữ chuỗi "YYYY-MM-DD", convert ra Date (giờ VN) riêng ở đây và
  // lại 1 lần nữa ở activity-log-list.tsx (client) trước khi gọi tRPC. Chưa
  // filter lần nào (không có trên URL) thì mặc định "trong tháng" — tính
  // NGAY TRÊN SERVER (không phải client) để tránh lệch giờ/hydration
  // mismatch giữa server-client khi phụ thuộc "hôm nay" (giống bao-cao).
  // Luôn tính default (kể cả khi URL đã có filter riêng) để truyền xuống
  // client so sánh "còn đúng mặc định hay không" — dot báo filter chỉ hiện
  // khi giá trị THỰC SỰ khác default, giống activeFilters() bên alix-bo.
  const defaultRange = getDefaultVNMonthRange();
  const defaultDateFrom = formatVNDateInputValue(defaultRange.start);
  const defaultDateTo = toInclusiveEndDateInputValue(defaultRange.end);
  const initialDateFrom = dateFrom || dateTo ? (dateFrom ?? "") : defaultDateFrom;
  const initialDateTo = dateFrom || dateTo ? (dateTo ?? "") : defaultDateTo;
  const dateFromValue = initialDateFrom ? parseVNDateInputValue(initialDateFrom) : undefined;
  const dateToValue = initialDateTo ? endOfVNDayExclusive(initialDateTo) : undefined;

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.activityLog.list.prefetch({
    page,
    pageSize,
    entityType,
    actorId,
    dateFrom: dateFromValue,
    dateTo: dateToValue,
  });

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <ActivityLogList
          page={page}
          pageSize={pageSize}
          entityType={entityType}
          actorId={actorId}
          dateFrom={initialDateFrom}
          dateTo={initialDateTo}
          defaultDateFrom={defaultDateFrom}
          defaultDateTo={defaultDateTo}
        />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
