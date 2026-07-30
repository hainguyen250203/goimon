/**
 * Lỗi được throw khi tool query_data nhận input không hợp lệ hoặc vi phạm quy
 * tắc an toàn (bảng/cột không được whitelist, join không có khoá ngoại thật...).
 * Message tiếng Việt vì được đọc trực tiếp bởi model để tự sửa lại input.
 */
export class AssistantQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantQueryError";
  }
}
