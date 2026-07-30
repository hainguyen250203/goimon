import { z } from "zod";

/**
 * Toán tử so sánh được phép dùng trong filter. Danh sách này CHÍNH LÀ whitelist
 * — không có nhánh "khác" nào trong lúc thực thi (xem run-structured-query.ts),
 * nên không có cách nào lọt qua 1 toán tử ngoài danh sách này.
 */
export const COMPARISON_OPERATORS = [
  "=",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "LIKE",
  "IN",
  "IS NULL",
  "IS NOT NULL",
  "BETWEEN",
] as const;

/** "column" hoặc "table.column" — bắt buộc ghi rõ bảng khi có join để tránh mập mờ. */
const columnRef = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/i, "Tên cột không hợp lệ")
  .max(80);

const scalarValue = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

const filterCondition = z.object({
  column: columnRef,
  operator: z.enum(COMPARISON_OPERATORS),
  /** Dùng cho "=", "!=", ">", "<", ">=", "<=", "LIKE". */
  value: scalarValue.optional(),
  /** Dùng cho "IN". */
  values: z.array(scalarValue).min(1).max(50).optional(),
  /** Dùng cho "BETWEEN" — [từ, đến]. */
  range: z.tuple([scalarValue, scalarValue]).optional(),
});

/** Nhóm OR — CHỈ 1 cấp (không lồng thêm and/or bên trong), vd "trả tiền mặt
 * HOẶC chuyển khoản". Cố tình không dùng schema đệ quy (z.lazy) vì khi chuyển
 * sang JSON Schema gửi cho OpenAI, phần đệ quy bị "defaulted to any" (mất hết
 * ràng buộc kiểu), khiến model có thể gửi input sai hình dạng mà không bị
 * chặn — gây lỗi ngẫu nhiên khó tái hiện. Không lồng được and/or thì đã có
 * đủ cho hầu hết câu hỏi thực tế (mảng filter ở cấp cao nhất vốn đã là AND). */
const filterOrGroup = z.object({
  or: z.array(filterCondition).min(2).max(5),
});

const filterNode = z.union([filterCondition, filterOrGroup]);
type FilterNode = z.infer<typeof filterNode>;

const join = z.object({
  table: z.string().max(64),
  left: columnRef,
  right: columnRef,
  type: z.enum(["inner", "left"]).default("left"),
});

const aggregate = z.object({
  fn: z.enum(["count", "sum", "avg", "min", "max"]),
  /** Bỏ qua khi fn = "count" để đếm toàn bộ dòng (COUNT(*)). */
  column: columnRef.optional(),
  alias: z.string().max(64),
});
export type AggregateSpec = z.infer<typeof aggregate>;

export const structuredQuerySchema = z
  .object({
    /** Mô tả ngắn bằng tiếng Việt tự nhiên việc đang tra cứu, KHÔNG nhắc tên
     * bảng/cột/SQL — hiển thị cho người dùng xem tiến trình (giống Lensy),
     * không phải tham số truy vấn thật, không ảnh hưởng câu SQL sinh ra. */
    purpose: z.string().max(200),
    table: z.string().max(64),
    columns: z.array(columnRef).min(1).max(30).optional(),
    aggregate: z.array(aggregate).max(5).optional(),
    groupBy: z.array(columnRef).max(5).optional(),
    /** Mảng ở cấp cao nhất = AND với nhau, giống ví dụ gốc [["status","=","PAID"], ...]. */
    filter: z.array(filterNode).max(20).optional(),
    join: z.array(join).max(3).optional(),
    sort: z.array(z.tuple([columnRef, z.enum(["ASC", "DESC"])])).max(3).optional(),
    limit: z.number().int().min(1).max(200).default(50),
    offset: z.number().int().min(0).max(5000).default(0),
  })
  .refine((q) => (q.columns?.length ?? 0) > 0 || (q.aggregate?.length ?? 0) > 0, {
    message: "Phải chọn ít nhất 1 cột (columns) hoặc 1 hàm tổng hợp (aggregate).",
  });

export type StructuredQuery = z.infer<typeof structuredQuerySchema>;
export type StructuredQueryFilterNode = FilterNode;
