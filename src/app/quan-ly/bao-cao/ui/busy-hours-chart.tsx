"use client";

import { Box, Text } from "@chakra-ui/react";

import type { ReportBusyHourRow } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";
import { SERIES_COLORS } from "./chart-style";

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * "Giờ bận rộn" kiểu Google Maps Popular times — cột thể hiện TRUNG BÌNH số
 * đơn đang hoạt động (đã tạo, chưa thanh toán xong) tại khung giờ đó, không
 * phải số đơn mới tạo. Trục X đi từ 12h trưa tới 11h trưa hôm sau (đúng nhịp
 * kinh doanh của quán, không phải 0h-23h) — thứ tự đã đúng sẵn từ `data`
 * (xem get-report.usecase.ts), chỉ cần format nhãn giờ.
 */
export function BusyHoursChart({ data }: { data: ReportBusyHourRow[] }) {
  if (data.length === 0) {
    return (
      <Box p={4} rounded="l3" borderWidth="1px">
        <Text fontSize="sm" color="fg.muted">
          Không có dữ liệu để vẽ biểu đồ.
        </Text>
      </Box>
    );
  }

  const categories = data.map((row) => formatHourLabel(row.hour));

  return (
    <EchartBox
      title="Giờ bận rộn"
      buildOption={(width) => {
        const isNarrow = width < 400;
        const axisFontSize = isNarrow ? 10 : 12;

        return {
          color: SERIES_COLORS,
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            valueFormatter: (value: number) => `${value} đơn đang phục vụ`,
          },
          grid: { left: "3%", right: "4%", top: "8%", bottom: "12%", containLabel: true },
          xAxis: {
            type: "category",
            data: categories,
            axisLabel: { fontSize: axisFontSize },
            axisLine: { lineStyle: { color: "#e2e8f0" } },
            axisTick: { show: false },
          },
          yAxis: {
            type: "value",
            minInterval: 1,
            axisLabel: { fontSize: axisFontSize },
            splitLine: { lineStyle: { color: "#f1f5f9" } },
          },
          series: [
            {
              name: "Số đơn đang phục vụ (TB)",
              type: "bar",
              data: data.map((row) => row.activeOrderCount),
              itemStyle: { color: SERIES_COLORS[0], borderRadius: [4, 4, 0, 0] },
            },
          ],
        };
      }}
    />
  );
}
