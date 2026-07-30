import { createQueryDataTool } from "./query-data.tool";
import { renderChartTool } from "./render-chart.tool";
import { renderDiagramTool } from "./render-diagram.tool";

export function assistantTools() {
  return {
    query_data: createQueryDataTool(),
    render_chart: renderChartTool,
    render_diagram: renderDiagramTool,
  };
}
