// Bảng màu + style đường "mượt + tô nền gradient" dùng chung cho các chart ở
// trang Báo cáo — tham khảo trực tiếp lib/utils/chart-utils.ts của
// alix-bo-frontend-v2 (được phép tham khảo UX/Chakra theo CLAUDE.md, cùng
// stack Chakra, khác pos-be/pos-fe).
export const SERIES_COLORS = [
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Đường mượt + tô nền gradient mờ dần, ẩn chấm lúc nghỉ — hover mới hiện 1
 * chấm to viền trắng. Giống hệt cách alix-bo-frontend-v2 làm cho mọi chart
 * xu hướng (hàm `lineSeriesStyle` trong chart-utils.ts của repo đó). */
export function lineSeriesStyle(color: string, areaOpacity = 0.28) {
  return {
    smooth: true,
    showSymbol: false,
    symbol: "circle" as const,
    symbolSize: 10,
    itemStyle: { color, borderColor: "#fff", borderWidth: 2 },
    lineStyle: { width: 2, color },
    areaStyle: {
      color: {
        type: "linear" as const,
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: withAlpha(color, areaOpacity) },
          { offset: 1, color: withAlpha(color, 0.02) },
        ],
      },
    },
    emphasis: {
      scale: false,
      itemStyle: { color, borderColor: "#fff", borderWidth: 2, shadowBlur: 6, shadowColor: withAlpha(color, 0.5) },
    },
  };
}

/** VNĐ dạng gọn cho trục biểu đồ (vd "1,2 Tr đ") — số dài chiếm hết chỗ trục Y. */
export function formatCompactVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", compactDisplay: "short" }).format(value) + "đ";
}
