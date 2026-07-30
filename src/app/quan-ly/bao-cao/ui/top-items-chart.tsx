"use client";

import { Box, Text } from "@chakra-ui/react";

import type { ReportTopItem } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";
import { SERIES_COLORS } from "./chart-style";

export function TopItemsChart({ data }: { data: ReportTopItem[] }) {
  if (data.length === 0) {
    return (
      <Box p={4} rounded="l3" borderWidth="1px">
        <Text fontSize="sm" color="fg.muted">
          Không có dữ liệu để vẽ biểu đồ.
        </Text>
      </Box>
    );
  }

  // echarts vẽ cột ngang từ dưới lên — đảo mảng để món bán chạy nhất nằm trên cùng.
  const rows = [...data].reverse();

  return (
    <EchartBox
      title="Món ăn bán chạy"
      buildOption={(width) => {
        // Tên món dễ dài — khung hẹp phải nhường ít chỗ hơn cho nhãn trục Y
        // và tự rút gọn bằng "..." (overflow: truncate) thay vì tràn ra ngoài.
        const isNarrow = width < 400;
        const axisFontSize = isNarrow ? 10 : 12;
        const gridLeft = isNarrow ? 80 : 110;

        return {
          color: SERIES_COLORS,
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: gridLeft, right: 24, top: "6%", bottom: 16, containLabel: true },
          // Số lượng bán luôn là số nguyên — ép minInterval=1 để echarts không
          // tự chia trục ra bước lẻ kiểu 0.5/1.5 khi giá trị lớn nhất nhỏ.
          xAxis: {
            type: "value",
            minInterval: 1,
            axisLabel: { fontSize: axisFontSize },
            splitLine: { lineStyle: { color: "#f1f5f9" } },
          },
          yAxis: {
            type: "category",
            data: rows.map((row) => row.itemName),
            // width + overflow: "truncate" là cách echarts tự rút gọn kèm
            // "...", không cần tự cắt chuỗi.
            axisLabel: { fontSize: axisFontSize, width: gridLeft - 8, overflow: "truncate" },
            axisTick: { show: false },
          },
          series: [
            {
              name: "Số lượng bán",
              type: "bar",
              barMaxWidth: 20,
              itemStyle: { color: SERIES_COLORS[0], borderRadius: [0, 4, 4, 0] },
              data: rows.map((row) => row.quantitySold),
            },
          ],
        };
      }}
    />
  );
}
