"use client";

import { Box, Text } from "@chakra-ui/react";

import type { ReportCategoryRow } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";

const SERIES_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

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
      buildOption={(width) => {
        const isNarrow = width < 400;
        const titleFontSize = isNarrow ? 11 : 13;
        const axisFontSize = isNarrow ? 10 : 12;

        return {
          title: { text: "Doanh thu theo danh mục món", textStyle: { fontSize: titleFontSize } },
          color: SERIES_COLORS,
          tooltip: { trigger: "axis" },
          grid: { left: 56, right: 16, top: 40, bottom: 32, containLabel: true },
          xAxis: {
            type: "category",
            data: data.map((row) => row.categoryName),
            axisLabel: { rotate: 30, fontSize: axisFontSize },
          },
          yAxis: { type: "value", axisLabel: { fontSize: axisFontSize } },
          series: [{ name: "Doanh thu", type: "bar", data: data.map((row) => row.revenue) }],
        };
      }}
    />
  );
}
