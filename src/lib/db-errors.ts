import { DrizzleQueryError } from "drizzle-orm";

/**
 * Lỗi driver Postgres thật (có `.code`) không văng thẳng ra ngoài —
 * drizzle-orm luôn bọc lại thành `DrizzleQueryError` (message = "Failed
 * query: <sql>\nparams: <params>", rất dài, lộ toàn bộ dữ liệu), giữ lỗi gốc
 * ở `.cause`. Đệ quy qua `.cause` để tìm đúng `code` gốc, không dừng lại ở
 * lớp bọc ngoài cùng.
 */
function getPgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("cause" in error) return getPgErrorCode(error.cause);
  return undefined;
}

/** Postgres error code cho foreign_key_violation — dùng khi xoá 1 row đang
 * bị tham chiếu bởi bảng khác (vd: xoá món ăn đã từng nằm trong order_items). */
export function isForeignKeyViolation(error: unknown): boolean {
  return getPgErrorCode(error) === "23503";
}

/** Postgres error code cho unique_violation (vd trùng tên vai trò/danh
 * mục...). */
export function isUniqueViolation(error: unknown): boolean {
  return getPgErrorCode(error) === "23505";
}

/**
 * Chuyển lỗi bất kỳ (từ usecase/repository) thành message AN TOÀN để trả về
 * cho client qua TRPCError — không bao giờ lộ nguyên văn lỗi driver Postgres
 * (chứa cả câu SQL + params). Error tự throw tay trong domain/usecase (vd
 * "Vai trò đang được gán cho 3 người dùng") vẫn được hiện nguyên văn — đó là
 * message đã soạn sẵn để người đọc hiểu, khác lỗi driver/`DrizzleQueryError`
 * ném ra ngoài ý muốn (luôn rơi về `fallback`, kể cả khi không nhận diện
 * được đúng loại vi phạm nào).
 */
export function toSafeErrorMessage(
  error: unknown,
  fallback: string,
  uniqueMessage?: string,
): string {
  if (uniqueMessage && isUniqueViolation(error)) return uniqueMessage;
  if (error instanceof DrizzleQueryError) return fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}
