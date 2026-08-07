"use client";

import { Bot, CalendarClock, CheckCircle2, Percent, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Box, Flex, Grid, Stack } from "@chakra-ui/react";

import { api } from "~/trpc/react";
import { formatVnd } from "~/lib/format-order";
import { useLocalStorageState } from "~/lib/use-local-storage-state";
import { KpiCard } from "../kpi-card";
import { toQueryRange } from "~/lib/vn-date-range";
import { ReportSettingsDrawer } from "./report-settings-drawer";
import { type ReportSectionKey } from "./ui/report-section-picker";
import { ShiftDetailCards } from "./ui/shift-detail-cards";
import { TopItemsChart } from "./ui/top-items-chart";
import { PaymentMethodPieChart } from "./ui/payment-method-pie-chart";
import { CategoryRevenueChart } from "./ui/category-revenue-chart";
import { PromotionUsageTable } from "./ui/promotion-usage-table";

const VISIBLE_SECTIONS_STORAGE_KEY = "goimon:bao-cao:visible-sections";

/** So sánh % với kỳ trước — undefined nghĩa là không có gì để so (kỳ trước = 0). */
function formatTrend(current: number, previous: number): string | undefined {
  if (previous === 0) return current === 0 ? undefined : "Mới so với kỳ trước";
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return "Không đổi so với kỳ trước";
  return percent > 0 ? `↑ ${percent}% so với kỳ trước` : `↓ ${Math.abs(percent)}% so với kỳ trước`;
}

export function ReportView({
  initialStart,
  initialEnd,
  categoryIds,
  allowedSections,
}: {
  initialStart: string;
  initialEnd: string;
  categoryIds: number[];
  /** Phần role có quyền xem (permission, không phải sở thích cá nhân) — xem
   * report-section-picker.tsx's SECTION_PERMISSION_KEY. */
  allowedSections: ReportSectionKey[];
}) {
  const { start, end } = toQueryRange(initialStart, initialEnd);
  const { data } = api.report.getReport.useQuery({
    start,
    end,
    categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
  });
  const [visibleSections, setVisibleSections] = useLocalStorageState<ReportSectionKey[]>(
    VISIBLE_SECTIONS_STORAGE_KEY,
    allowedSections,
  );
  // Quyền là gate CỨNG — dù localStorage còn lưu section đã từng bật trước
  // khi bị thu hồi quyền, vẫn phải ẩn (không tin tưởng state cũ trên máy
  // người dùng để quyết định hiển thị dữ liệu nhạy cảm).
  const isVisible = (section: ReportSectionKey) =>
    visibleSections.includes(section) && allowedSections.includes(section);

  return (
    <Stack gap={6}>
      <Flex justify="flex-end">
        <ReportSettingsDrawer
          start={initialStart}
          end={initialEnd}
          categoryIds={categoryIds}
          visibleSections={visibleSections}
          onApplySections={setVisibleSections}
          allowedSections={allowedSections}
        />
      </Flex>

      {data && (
        <>
          {/* Doanh thu gộp -> Đã giảm giá -> Thực nhận, đúng thứ tự "waterfall"
              để dễ hiểu tiền đi đâu — rồi tới số đơn/ca/TB. */}
          {isVisible("kpi") && (
            <Grid templateColumns={{ base: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={{ base: 3, md: 4 }}>
              <KpiCard
                label="Doanh thu gộp"
                value={formatVnd(data.summary.grossRevenue)}
                helpText={formatTrend(data.summary.grossRevenue, data.previousSummary.grossRevenue)}
                icon={<Receipt size={18} />}
                colorPalette="gray"
              />
              <KpiCard
                label="Đã giảm giá"
                value={formatVnd(data.summary.discountAmount)}
                helpText={formatTrend(data.summary.discountAmount, data.previousSummary.discountAmount)}
                icon={<Percent size={18} />}
                colorPalette="pink"
              />
              <KpiCard
                label="Doanh thu thực nhận"
                value={formatVnd(data.summary.totalRevenue)}
                helpText={formatTrend(data.summary.totalRevenue, data.previousSummary.totalRevenue)}
                icon={<Wallet size={18} />}
                colorPalette="green"
              />
              <KpiCard
                label="Đơn đã thanh toán"
                value={String(data.summary.paidOrderCount)}
                helpText={formatTrend(data.summary.paidOrderCount, data.previousSummary.paidOrderCount)}
                icon={<CheckCircle2 size={18} />}
                colorPalette="blue"
              />
              <KpiCard
                label="Số ca"
                value={String(data.summary.shiftCount)}
                helpText={formatTrend(data.summary.shiftCount, data.previousSummary.shiftCount)}
                icon={<CalendarClock size={18} />}
                colorPalette="purple"
              />
              <KpiCard
                label="Doanh thu TB / ca"
                value={formatVnd(data.summary.averageRevenuePerShift)}
                helpText={formatTrend(
                  data.summary.averageRevenuePerShift,
                  data.previousSummary.averageRevenuePerShift,
                )}
                icon={<TrendingUp size={18} />}
                colorPalette="orange"
              />
              <KpiCard
                label="Chi phí AI"
                value={`$${data.summary.aiCostUsd.toFixed(2)}`}
                helpText={formatTrend(data.summary.aiCostUsd, data.previousSummary.aiCostUsd)}
                icon={<Bot size={18} />}
                colorPalette="teal"
              />
            </Grid>
          )}

          {isVisible("shiftDetailCards") && <ShiftDetailCards data={data.shiftBreakdown} />}

          {(() => {
            const showTopItems = isVisible("topItems");
            const showPaymentMethod = isVisible("paymentMethod");
            if (!showTopItems && !showPaymentMethod) return null;
            // Chỉ còn 1 trong 2 (bị ẩn do quyền hoặc do tự tắt ở "Tuỳ chỉnh
            // báo cáo") thì phần còn lại giãn full-width thay vì chừa nửa
            // dòng trống bên cạnh.
            const bothVisible = showTopItems && showPaymentMethod;
            return (
              <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
                {showTopItems && (
                  <Box gridColumn={bothVisible ? undefined : { lg: "span 2" }}>
                    <TopItemsChart data={data.topItems} />
                  </Box>
                )}
                {showPaymentMethod && (
                  <Box gridColumn={bothVisible ? undefined : { lg: "span 2" }}>
                    <PaymentMethodPieChart data={data.byPaymentMethod} />
                  </Box>
                )}
              </Grid>
            );
          })()}

          {isVisible("categoryRevenue") && <CategoryRevenueChart data={data.byCategory} />}

          {isVisible("promotionUsage") && <PromotionUsageTable data={data.promotionUsage} />}
        </>
      )}
    </Stack>
  );
}
