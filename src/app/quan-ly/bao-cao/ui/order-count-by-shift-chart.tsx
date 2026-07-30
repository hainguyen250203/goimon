"use client";

import { Box, Text } from "@chakra-ui/react";

import type { ReportShiftRow } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";

const SERIES_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

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

  return (
    <EchartBox
      buildOption={(width) => {
        const isNarrow = width < 400;
        const titleFontSize = isNarrow ? 11 : 13;
        const axisFontSize = isNarrow ? 10 : 12;

        return {
          title: { text: "Số đơn theo ca", textStyle: { fontSize: titleFontSize } },
          color: SERIES_COLORS,
          tooltip: { trigger: "axis" },
          legend: { bottom: needsZoom ? 32 : 0, type: "scroll", textStyle: { fontSize: axisFontSize } },
          grid: { left: 48, right: 16, top: 40, bottom: needsZoom ? 84 : 40, containLabel: true },
          xAxis: {
            type: "category",
            data: data.map((row) => formatShiftLabel(row.startTime)),
            axisLabel: { rotate: 30, fontSize: axisFontSize },
          },
          // Số đơn luôn là số nguyên — ép minInterval=1, tránh trục chia bước lẻ.
          yAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: axisFontSize } },
          dataZoom: needsZoom ? [{ type: "slider", height: 16 }, { type: "inside" }] : undefined,
          series: [
            { name: "Đã thanh toán", type: "line", smooth: true, data: data.map((row) => row.paidOrderCount) },
            { name: "Đã huỷ", type: "line", smooth: true, data: data.map((row) => row.cancelledOrderCount) },
          ],
        };
      }}
    />
  );
}
