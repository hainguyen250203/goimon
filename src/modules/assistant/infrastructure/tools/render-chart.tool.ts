import { tool } from "ai";
import { z } from "zod";

export const chartSpecSchema = z.object({
  type: z.enum(["line", "bar", "pie"]),
  title: z.string().max(120),
  /** Trục X (label mỗi điểm) — bỏ qua khi type = "pie". */
  xKey: z.string().max(60).optional(),
  series: z
    .array(z.object({ key: z.string().max(60), label: z.string().max(80) }))
    .min(1)
    .max(8),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(200),
});

export type ChartSpec = z.infer<typeof chartSpecSchema>;

/** Không đụng DB — chỉ validate lại spec, việc vẽ thật diễn ra ở client (echarts-for-react). */
export const renderChartTool = tool({
  description:
    "Vẽ biểu đồ (line/bar/pie) minh hoạ cho dữ liệu đã truy vấn được. Tối đa 8 series, 200 dòng dữ liệu.",
  inputSchema: chartSpecSchema,
  execute: async (input) => input,
});
