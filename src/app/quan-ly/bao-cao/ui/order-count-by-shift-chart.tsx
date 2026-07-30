"use client";

import { Box, Text } from "@chakra-ui/react";

import type { ReportShiftRow } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";
import { lineSeriesStyle, SERIES_COLORS } from "./chart-style";

function formatShiftLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function OrderCountByShiftChart({ data }: { data: ReportShiftRow[] }) {
  if (data.length === 0) {
    return (
      <Box p={4} rounded="l3" borderWidth="1px">
        <Text fontSize="sm" color="fg.muted">
          Không có dữ liệu để vẽ biểu đồ.
        </Text>
      </Box>
    );
  }

  const needsZoom = data.length > 8;
  const categories = data.map((row) => formatShiftLabel(row.startTime));

  return (
    <EchartBox
      title="Số đơn theo ca"
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
          // Số đơn luôn là số nguyên — ép minInterval=1, tránh trục chia bước lẻ.
          yAxis: {
            type: "value",
            minInterval: 1,
            axisLabel: { fontSize: axisFontSize },
            splitLine: { lineStyle: { color: "#f1f5f9" } },
          },
          dataZoom: needsZoom ? [{ type: "slider", height: 16 }, { type: "inside" }] : undefined,
          series: [
            {
              name: "Đã thanh toán",
              type: "line",
              data: data.map((row) => row.paidOrderCount),
              ...lineSeriesStyle(SERIES_COLORS[0]!, 0.15),
            },
            {
              name: "Đã huỷ",
              type: "line",
              data: data.map((row) => row.cancelledOrderCount),
              ...lineSeriesStyle(SERIES_COLORS[3]!, 0.15),
            },
          ],
        };
      }}
    />
  );
}
