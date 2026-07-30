"use client";

import { Box, Text } from "@chakra-ui/react";

import { PAYMENT_METHOD_LABEL } from "~/lib/format-order";
import type { ReportPaymentMethodRow } from "~/modules/report/domain/report.entity";
import { EchartBox } from "./echart-box";

const SERIES_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

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
      buildOption={(width) => {
        const isNarrow = width < 400;
        const titleFontSize = isNarrow ? 11 : 13;
        const legendFontSize = isNarrow ? 10 : 12;
        const radius = isNarrow ? "55%" : "65%";

        return {
          title: { text: "Doanh thu theo phương thức thanh toán", textStyle: { fontSize: titleFontSize } },
          color: SERIES_COLORS,
          tooltip: { trigger: "item" },
          // type: "scroll" — legend tự phân trang/cuộn thay vì tràn ngang ra
          // ngoài khung khi container hẹp, đúng cách echarts xử lý legend dài.
          legend: { bottom: 0, type: "scroll", textStyle: { fontSize: legendFontSize } },
          series: [
            {
              type: "pie",
              radius,
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
