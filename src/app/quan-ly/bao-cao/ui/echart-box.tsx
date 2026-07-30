"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import ReactECharts from "echarts-for-react";
import { Box, Flex, Heading } from "@chakra-ui/react";

/**
 * Bọc ReactECharts, tự đo chiều rộng THẬT của container bằng ResizeObserver
 * rồi truyền vào `buildOption(width)` để tự tính lại toàn bộ option (font
 * size, margin nhãn trục...) — KHÔNG dùng `useBreakpointValue` (breakpoint
 * Chakra dựa theo viewport, không phải kích thước container chart thực tế;
 * co cửa sổ/đổi số cột Grid không luôn khớp) và luôn `setOption` bằng
 * `notMerge` để đảm bảo áp dụng đầy đủ giá trị mới, không bị merge dở dang
 * với option cũ. Trước đây chỉ gọi `chart.resize()` khi container đổi kích
 * thước — resize() chỉ vẽ lại khung theo kích thước mới nhưng vẫn dùng các
 * giá trị pixel cũ (width nhãn, fontSize) đã "đóng băng" lúc mount, nên phải
 * F5 mới tính lại đúng.
 *
 * `title`/`actions` hiện ở NGOÀI canvas echarts, trong cùng 1 Box viền duy
 * nhất — không đặt `title` trong option nữa (tránh 2 tiêu đề đè nhau), và
 * không bọc thêm 1 Box viền khác ở component cha (tránh lồng border).
 */
export function EchartBox({
  title,
  actions,
  buildOption,
}: {
  title?: string;
  actions?: ReactNode;
  buildOption: (containerWidth: number) => Record<string, unknown>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReactECharts>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? el.clientWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    chartRef.current?.getEchartsInstance().resize();
  }, [width]);

  return (
    <Box rounded="l3" borderWidth="1px" p={3} bg="bg.panel">
      {(title ?? actions) && (
        <Flex align="center" justify="space-between" gap={2} wrap="wrap" mb={2}>
          {title && (
            <Heading size="xs" textTransform="uppercase" letterSpacing="0.04em" color="fg.muted">
              {title}
            </Heading>
          )}
          {actions}
        </Flex>
      )}
      <Box ref={containerRef}>
        {width > 0 && (
          <ReactECharts
            ref={chartRef}
            option={buildOption(width)}
            notMerge
            style={{ height: 300, width: "100%" }}
          />
        )}
      </Box>
    </Box>
  );
}
