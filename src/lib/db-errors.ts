/** Postgres error code cho foreign_key_violation — dùng khi xoá 1 row đang
 * bị tham chiếu bởi bảng khác (vd: xoá món ăn đã từng nằm trong order_items). */
export function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23503"
  );
}
