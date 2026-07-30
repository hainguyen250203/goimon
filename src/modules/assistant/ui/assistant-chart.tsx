"use client";

import ReactECharts from "echarts-for-react";
import { Box, Text } from "@chakra-ui/react";

import type { ChartSpec } from "../infrastructure/tools/render-chart.tool";

// Bảng màu cố định — không random/cycle theo từng câu hỏi, để biểu đồ nhất
// quán giữa các lượt chat (xem dataviz skill).
const SERIES_COLORS = [
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

export function AssistantChart({ spec }: { spec: ChartSpec }) {
  if (spec.data.length === 0) {
    return (
      <Box p={4} rounded="l3" borderWidth="1px">
        <Text fontSize="sm" color="fg.muted">
          Không có dữ liệu để vẽ biểu đồ.
        </Text>
      </Box>
    );
  }

  const option =
    spec.type === "pie"
      ? buildPieOption(spec)
      : buildAxisOption(spec);

  return (
    <Box rounded="l3" borderWidth="1px" p={2}>
      <ReactECharts option={option} style={{ height: 320, width: "100%" }} />
    </Box>
  );
}

function buildAxisOption(spec: ChartSpec) {
  const categories = spec.xKey ? spec.data.map((row) => String(row[spec.xKey!] ?? "")) : undefined;

  return {
    title: { text: spec.title, textStyle: { fontSize: 13 } },
    color: SERIES_COLORS,
    tooltip: { trigger: "axis" },
    legend: spec.series.length >= 2 ? { bottom: 0 } : undefined,
    grid: { left: 40, right: 16, top: 40, bottom: spec.series.length >= 2 ? 32 : 16, containLabel: true },
    xAxis: { type: "category", data: categories },
    yAxis: { type: "value" },
    series: spec.series.map((s) => ({
      name: s.label,
      type: spec.type,
      data: spec.data.map((row) => Number(row[s.key] ?? 0)),
    })),
  };
}

function buildPieOption(spec: ChartSpec) {
  const nameKey = spec.xKey;
  const valueKey = spec.series[0]?.key;

  return {
    title: { text: spec.title, textStyle: { fontSize: 13 } },
    color: SERIES_COLORS,
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: "65%",
        data: spec.data.map((row) => ({
          name: nameKey ? String(row[nameKey] ?? "") : "",
          value: valueKey ? Number(row[valueKey] ?? 0) : 0,
        })),
      },
    ],
  };
}
