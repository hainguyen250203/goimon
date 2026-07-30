"use client";

import { Box, Text } from "@chakra-ui/react";

import type { ReportShiftRow } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";

// Bảng màu cố định, đồng bộ với AssistantChart (modules/assistant/ui/assistant-chart.tsx).
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

  return (
    <EchartBox
      buildOption={(width) => {
        // Dựa theo chiều rộng THẬT của khung chart (đo bằng ResizeObserver ở
        // EchartBox), không dùng breakpoint Chakra — luôn khớp đúng kích
        // thước hiện tại, kể cả khi co cửa sổ mà không reload.
        const isNarrow = width < 400;
        const titleFontSize = isNarrow ? 11 : 13;
        const axisFontSize = isNarrow ? 10 : 12;

        return {
          title: { text: "Doanh thu theo ca", textStyle: { fontSize: titleFontSize } },
          color: SERIES_COLORS,
          tooltip: { trigger: "axis" },
          legend: { bottom: needsZoom ? 32 : 0, type: "scroll", textStyle: { fontSize: axisFontSize } },
          grid: { left: 56, right: 16, top: 40, bottom: needsZoom ? 84 : 40, containLabel: true },
          xAxis: {
            type: "category",
            data: data.map((row) => formatShiftLabel(row.startTime)),
            axisLabel: { rotate: 30, fontSize: axisFontSize },
          },
          yAxis: { type: "value", axisLabel: { fontSize: axisFontSize } },
          dataZoom: needsZoom ? [{ type: "slider", height: 16 }, { type: "inside" }] : undefined,
          series: [
            { name: "Tổng doanh thu", type: "line", smooth: true, data: data.map((row) => row.totalRevenue) },
            { name: "Tiền mặt", type: "line", smooth: true, data: data.map((row) => row.cashRevenue) },
            { name: "Chuyển khoản", type: "line", smooth: true, data: data.map((row) => row.transferRevenue) },
          ],
        };
      }}
    />
  );
}
