"use client";

import { Box, Text } from "@chakra-ui/react";

import type { ReportShiftRow } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";
import { formatCompactVnd, lineSeriesStyle, SERIES_COLORS } from "./chart-style";

function formatShiftLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function RevenueByShiftChart({ data }: { data: ReportShiftRow[] }) {
  if (data.length === 0) {
    return (
      <Box p={4} rounded="l3" borderWidth="1px">
        <Text fontSize="sm" color="fg.muted">
          Không có dữ liệu để vẽ biểu đồ.
        </Text>
      </Box>
    );
  }

  // Nhiều ca trong khoảng đã chọn dễ làm trục X dày đặc — bật dataZoom (slider
  // trượt) giống cách alix-bo-frontend-v2's chart-utils.ts xử lý trục nhiều điểm.
  const needsZoom = data.length > 8;
  const categories = data.map((row) => formatShiftLabel(row.startTime));

  return (
    <EchartBox
      title="Doanh thu theo ca"
      buildOption={(width) => {
        const isNarrow = width < 400;
        const axisFontSize = isNarrow ? 10 : 12;

        return {
          color: SERIES_COLORS,
          tooltip: { trigger: "axis", axisPointer: { type: "line", z: 0 } },
          legend: { bottom: needsZoom ? 32 : 0, type: "scroll", textStyle: { fontSize: axisFontSize } },
          grid: {
            left: "3%",
            right: "4%",
            top: "8%",
            bottom: needsZoom ? "26%" : "16%",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: categories,
            axisLabel: { rotate: 30, fontSize: axisFontSize },
            axisLine: { lineStyle: { color: "#e2e8f0" } },
            axisTick: { show: false },
          },
          yAxis: {
            type: "value",
            axisLabel: { fontSize: axisFontSize, formatter: (v: number) => formatCompactVnd(v) },
            splitLine: { lineStyle: { color: "#f1f5f9" } },
          },
          dataZoom: needsZoom ? [{ type: "slider", height: 16 }, { type: "inside" }] : undefined,
          series: [
            {
              name: "Tổng doanh thu",
              type: "line",
              data: data.map((row) => row.totalRevenue),
              ...lineSeriesStyle(SERIES_COLORS[0]!, 0.24),
            },
            {
              name: "Tiền mặt",
              type: "line",
              data: data.map((row) => row.cashRevenue),
              ...lineSeriesStyle(SERIES_COLORS[1]!, 0.1),
            },
            {
              name: "Chuyển khoản",
              type: "line",
              data: data.map((row) => row.transferRevenue),
              ...lineSeriesStyle(SERIES_COLORS[2]!, 0.1),
            },
          ],
        };
      }}
    />
  );
}
