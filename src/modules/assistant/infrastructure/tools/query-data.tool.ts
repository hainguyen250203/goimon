import { tool } from "ai";

import { AssistantQueryError } from "../query-tool/assistant-query.error";
import { runStructuredQuery } from "../query-tool/run-structured-query";
import { structuredQuerySchema } from "../query-tool/structured-query.schema";

export function createQueryDataTool() {
  return tool({
    description:
      "Truy vấn READ-ONLY dữ liệu kinh doanh (đơn hàng, món ăn, khuyến mãi, ca làm...). " +
      "Chỉ dùng đúng tên bảng/cột đã liệt kê trong phần Schema dữ liệu của system prompt. " +
      "Ưu tiên dùng 'aggregate' (sum/count/avg) cho câu hỏi tổng hợp thay vì liệt kê dòng. " +
      "'purpose' là BẮT BUỘC — mô tả ngắn gọn tự nhiên việc đang làm để hiển thị cho người " +
      "dùng xem tiến trình, không được nhắc tên bảng/cột/SQL trong đó.",
    inputSchema: structuredQuerySchema,
    execute: async (input) => {
      try {
        return await runStructuredQuery(input);
      } catch (error) {
        if (error instanceof AssistantQueryError) {
          return { isError: true, message: error.message };
        }
        return {
          isError: true,
          message: error instanceof Error ? error.message : "Truy vấn thất bại.",
        };
      }
    },
  });
}
