import { tool } from "ai";
import { z } from "zod";

export const diagramSpecSchema = z.object({
  title: z.string().max(120),
  nodes: z
    .array(z.object({ id: z.string().max(40), label: z.string().max(80) }))
    .min(1)
    .max(12),
  edges: z
    .array(
      z.object({
        from: z.string().max(40),
        to: z.string().max(40),
        label: z.string().max(40).optional(),
      }),
    )
    .max(20),
});

export type DiagramSpec = z.infer<typeof diagramSpecSchema>;

/** Không đụng DB — chỉ validate lại spec, render bằng component SVG đơn giản ở client. */
export const renderDiagramTool = tool({
  description:
    "Vẽ sơ đồ quy trình/trạng thái đơn giản (nodes + edges có hướng), vd vòng đời đơn hàng. " +
    "Tối đa 12 node, 20 cạnh.",
  inputSchema: diagramSpecSchema,
  execute: async (input) => input,
});
