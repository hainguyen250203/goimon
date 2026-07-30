/**
 * Tài liệu tham chiếu ĐẦY ĐỦ các field/type của tool query_data, nhúng thẳng
 * vào system prompt (xem system-prompt.ts) để model không phải đoán mò cách
 * dùng — đặc biệt là mẫu "top N theo 1 chỉ số tính toán" (aggregate + groupBy
 * + sort theo alias), pattern hay bị model thử sai nhiều lần trước khi có
 * tài liệu này. Bản sao markdown cho người đọc: docs/tro-ly-ai-query-schema.md
 * (giữ đồng bộ nội dung nếu sửa file này).
 */
export const QUERY_DSL_REFERENCE = `## Cấu trúc đầy đủ tham số của query_data

\`\`\`
purpose: string (BẮT BUỘC) — mô tả ngắn tự nhiên, không nhắc bảng/cột/SQL.
table: string (BẮT BUỘC) — tên bảng, phải nằm trong "Schema dữ liệu" bên dưới.
columns: string[] (optional) — danh sách cột cần lấy. "col" hoặc "table.col" khi có join.
aggregate: { fn: "count"|"sum"|"avg"|"min"|"max", column?: string, alias: string }[] (optional)
  — column bỏ qua khi fn="count" (COUNT(*)). PHẢI có ít nhất 1 trong "columns"/"aggregate".
groupBy: string[] (optional) — nhóm theo cột nào, dùng cùng aggregate.
filter: (Condition | { or: Condition[] })[] (optional)
  — mảng ở cấp cao nhất luôn là AND với nhau. Condition = {
      column: string, operator: "="|"!="|">"|"<"|">="|"<="|"LIKE"|"IN"|"IS NULL"|"IS NOT NULL"|"BETWEEN",
      value?: string|number|boolean|null,      // cho =,!=,>,<,>=,<=,LIKE
      values?: (string|number|boolean|null)[], // cho IN
      range?: [value, value],                  // cho BETWEEN
    }
  — { or: [...] } gộp nhiều Condition bằng OR, KHÔNG lồng thêm and/or bên trong nhóm or.
join: { table: string, left: string, right: string, type?: "inner"|"left" }[] (optional)
  — left/right BẮT BUỘC dạng "table.column". Chỉ join được nếu 2 bảng có khoá ngoại thật.
sort: [string, "ASC"|"DESC"][] (optional)
  — phần tử đầu là tên CỘT THẬT hoặc ALIAS đã khai báo trong "aggregate" (xem ví dụ 2).
limit: number (mặc định 50, tối đa 200)
offset: number (mặc định 0)
\`\`\`

## Ví dụ 1 — tổng hợp có điều kiện ("doanh thu hôm nay")
\`\`\`json
{
  "purpose": "Tính doanh thu các đơn đã thanh toán hôm nay",
  "table": "orders",
  "aggregate": [{ "fn": "sum", "column": "totalAmount", "alias": "revenue" }],
  "filter": [
    { "column": "status", "operator": "=", "value": "paid" },
    { "column": "paidConfirmedAt", "operator": ">=", "value": "2024-06-08" },
    { "column": "paidConfirmedAt", "operator": "<", "value": "2024-06-09" }
  ]
}
\`\`\`

## Ví dụ 2 — "top N theo 1 chỉ số tính toán" (vd món bán chạy nhất)
Muốn sắp xếp theo kết quả 1 hàm tổng hợp (không phải cột thật), dùng ĐÚNG alias đã
đặt trong "aggregate" ở trường "sort" — KHÔNG tự bịa tên cột khác:
\`\`\`json
{
  "purpose": "Tìm món bán chạy nhất tuần này theo số lượng bán ra",
  "table": "order_items",
  "columns": ["itemName"],
  "aggregate": [{ "fn": "sum", "column": "quantity", "alias": "total_sold" }],
  "groupBy": ["itemName"],
  "sort": [["total_sold", "DESC"]],
  "limit": 1
}
\`\`\`

## Ví dụ 3 — join 2 bảng có khoá ngoại thật
\`\`\`json
{
  "purpose": "Xem đơn hàng kèm tên bàn",
  "table": "orders",
  "columns": ["orders.id", "orders.status", "tables.name"],
  "join": [{ "table": "tables", "left": "orders.tableId", "right": "tables.id", "type": "left" }],
  "limit": 20
}
\`\`\`
`;
