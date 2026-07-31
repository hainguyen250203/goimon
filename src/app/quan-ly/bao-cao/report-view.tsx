"use client";

import { Bot, CalendarClock, CheckCircle2, Percent, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Grid, Stack } from "@chakra-ui/react";

import { api } from "~/trpc/react";
import { formatVnd } from "~/lib/format-order";
import { KpiCard } from "../kpi-card";
import { toQueryRange } from "./date-range";
import { ReportFilters } from "./report-filters";
import { RevenueByShiftChart } from "./ui/revenue-by-shift-chart";
import { OrderCountByShiftChart } from "./ui/order-count-by-shift-chart";
import { TopItemsChart } from "./ui/top-items-chart";
import { PaymentMethodPieChart } from "./ui/payment-method-pie-chart";
import { CategoryRevenueChart } from "./ui/category-revenue-chart";
import { PromotionUsageTable } from "./ui/promotion-usage-table";

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
}: {
  initialStart: string;
  initialEnd: string;
  categoryIds: number[];
}) {
  const { start, end } = toQueryRange(initialStart, initialEnd);
  const { data } = api.report.getReport.useQuery({
    start,
    end,
    categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
  });

  return (
    <Stack gap={6}>
      <ReportFilters start={initialStart} end={initialEnd} categoryIds={categoryIds} />

      {data && (
        <>
          {/* Doanh thu gộp -> Đã giảm giá -> Thực nhận, đúng thứ tự "waterfall"
              để dễ hiểu tiền đi đâu — rồi tới số đơn/ca/TB. */}
          <Grid templateColumns={{ base: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={{ base: 3, md: 4 }}>
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

          <RevenueByShiftChart data={data.shiftBreakdown} />
          <OrderCountByShiftChart data={data.shiftBreakdown} />

          <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
            <TopItemsChart data={data.topItems} />
            <PaymentMethodPieChart data={data.byPaymentMethod} />
          </Grid>

          <CategoryRevenueChart data={data.byCategory} />

          <PromotionUsageTable data={data.promotionUsage} />
        </>
      )}
    </Stack>
  );
}
