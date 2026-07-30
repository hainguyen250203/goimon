import { ALLOWED_TABLES, getAllowedColumns, getForeignKeyEdges } from "./table-registry";

/** Mô tả ý nghĩa nghiệp vụ ngắn gọn cho từng bảng — cột/kiểu dữ liệu đã tự
 * suy ra từ Drizzle (xem table-registry.ts) nên không cần liệt kê lại ở đây. */
const TABLE_DESCRIPTIONS: Record<string, string> = {
  orders: "Đơn hàng — từ lúc gọi món đến thanh toán/huỷ.",
  order_items: "Từng món trong 1 đơn hàng (snapshot tên/giá tại thời điểm gọi món).",
  order_events: "Timeline của 1 đơn: gọi món, in bill, thanh toán, huỷ.",
  menu_items: "Món ăn trong thực đơn.",
  categories: "Danh mục món ăn.",
  tables: "Bàn ăn trong nhà hàng.",
  areas: "Khu vực chứa các bàn.",
  promotions: "Chương trình khuyến mãi (giảm giá).",
  shifts: "Ca làm việc (mở/đóng ca).",
  printers: "Máy in bill.",
  payment_config: "Cấu hình tài khoản ngân hàng nhận thanh toán (chỉ 1 dòng).",
  activity_logs: "Nhật ký thao tác quản trị trên toàn hệ thống.",
};

function describeTable(tableName: string): string {
  const columns = getAllowedColumns(tableName);
  const columnList = Object.entries(columns)
    .map(([key, col]) => {
      // Cột kiểu enum (vd trạng thái đơn hàng) — liệt kê ĐÚNG giá trị hợp lệ để
      // model không tự đoán sai case/chính tả (vd viết "OPEN" thay vì "open").
      const enumValues = col.enumValues;
      const enumHint = enumValues?.length ? `, giá trị hợp lệ: ${enumValues.join("/")}` : "";
      return `${key} (${col.dataType}${col.notNull ? "" : ", nullable"}${enumHint})`;
    })
    .join(", ");
  const edges = getForeignKeyEdges(tableName)
    .map((e) => `${tableName}.${e.fromColumn} -> ${e.toTable}.${e.toColumn}`)
    .join("; ");

  const lines = [
    `### ${tableName} — ${TABLE_DESCRIPTIONS[tableName] ?? ""}`,
    `Cột: ${columnList}`,
  ];
  if (edges) lines.push(`Khoá ngoại: ${edges}`);
  return lines.join("\n");
}

export function generateSchemaContext(): string {
  return Object.keys(ALLOWED_TABLES).map(describeTable).join("\n\n");
}

// Tính 1 lần lúc module load — schema Drizzle không đổi lúc runtime, nên
// không cần tool "load_schema" như bản Lensy tham khảo (schema ở đây biết
// trước lúc build, chỉ ~12 bảng, nhúng thẳng vào system prompt là đủ rẻ).
export const SCHEMA_CONTEXT = generateSchemaContext();
