"use client";

import { Box, Text } from "@chakra-ui/react";

import { PAYMENT_METHOD_LABEL } from "~/lib/format-order";
import type { ReportPaymentMethodRow } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";
import { SERIES_COLORS } from "./chart-style";

// Luôn hiện đủ cả 2 phương thức (kể cả bên nào = 0) — để thấy rõ tỷ lệ so
// sánh, không chỉ hiện mỗi phương thức nào có dữ liệu.
const PAYMENT_METHODS = ["cash", "transfer"] as const;

export function PaymentMethodPieChart({ data }: { data: ReportPaymentMethodRow[] }) {
  if (data.length === 0) {
    return (
      <Box p={4} rounded="l3" borderWidth="1px">
        <Text fontSize="sm" color="fg.muted">
          Không có dữ liệu để vẽ biểu đồ.
        </Text>
      </Box>
    );
  }

  const revenueByMethod = new Map(data.map((row) => [row.paymentMethod, row.revenue]));

  return (
    <EchartBox
      title="Doanh thu theo phương thức thanh toán"
      buildOption={(width) => {
        const isNarrow = width < 400;
        const legendFontSize = isNarrow ? 10 : 12;

        return {
          color: SERIES_COLORS,
          tooltip: { trigger: "item", formatter: "{b}: {c}đ ({d}%)" },
          // type: "scroll" — legend tự phân trang/cuộn thay vì tràn ngang ra
          // ngoài khung khi container hẹp, đúng cách echarts xử lý legend dài.
          legend: { bottom: 0, type: "scroll", textStyle: { fontSize: legendFontSize } },
          series: [
            {
              type: "pie",
              // Dạng donut (2 bán kính) + label chỉ hiện ở giữa lúc hover —
              // giống style clean của alix-bo-frontend-v2's createPieChartConfig.
              radius: ["40%", "70%"],
              avoidLabelOverlap: false,
              label: { show: false, position: "center" },
              emphasis: { label: { show: true, fontSize: 18, fontWeight: "bold" } },
              labelLine: { show: false },
              data: PAYMENT_METHODS.map((method) => ({
                name: PAYMENT_METHOD_LABEL[method] ?? method,
                value: revenueByMethod.get(method) ?? 0,
              })),
            },
          ],
        };
      }}
    />
  );
}
