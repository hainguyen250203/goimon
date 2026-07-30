import { createQueryDataTool } from "./query-data.tool";
import { renderChartTool } from "./render-chart.tool";
import { renderDiagramTool } from "./render-diagram.tool";

/** actorId dùng để ghi audit log mỗi lần query_data được gọi (xem run-structured-query.ts). */
export function assistantTools(actorId: string) {
  return {
    query_data: createQueryDataTool(actorId),
    render_chart: renderChartTool,
    render_diagram: renderDiagramTool,
  };
}
