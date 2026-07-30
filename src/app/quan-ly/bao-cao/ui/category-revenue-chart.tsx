"use client";

import { Box, Text } from "@chakra-ui/react";

import type { ReportCategoryRow } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";
import { formatCompactVnd, SERIES_COLORS } from "./chart-style";

export function CategoryRevenueChart({ data }: { data: ReportCategoryRow[] }) {
  if (data.length === 0) {
    return (
      <Box p={4} rounded="l3" borderWidth="1px">
        <Text fontSize="sm" color="fg.muted">
          Không có dữ liệu để vẽ biểu đồ.
        </Text>
      </Box>
    );
  }

  return (
    <EchartBox
      title="Doanh thu theo danh mục món"
      buildOption={(width) => {
        const isNarrow = width < 400;
        const axisFontSize = isNarrow ? 10 : 12;

        return {
          color: SERIES_COLORS,
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: "3%", right: "4%", top: "6%", bottom: "22%", containLabel: true },
          xAxis: {
            type: "category",
            data: data.map((row) => row.categoryName),
            axisLabel: { rotate: 30, fontSize: axisFontSize },
            axisLine: { lineStyle: { color: "#e2e8f0" } },
            axisTick: { show: false },
          },
          yAxis: {
            type: "value",
            axisLabel: { fontSize: axisFontSize, formatter: (v: number) => formatCompactVnd(v) },
            splitLine: { lineStyle: { color: "#f1f5f9" } },
          },
          series: [
            {
              name: "Doanh thu",
              type: "bar",
              itemStyle: { color: SERIES_COLORS[0], borderRadius: [4, 4, 0, 0] },
              data: data.map((row) => row.revenue),
            },
          ],
        };
      }}
    />
  );
}
