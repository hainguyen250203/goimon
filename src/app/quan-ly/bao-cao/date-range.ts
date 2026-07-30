const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Chuỗi "YYYY-MM-DD" theo giờ Việt Nam — khớp `value` của `<input type="date">`. */
export function formatVNDateInputValue(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function parseVNDateInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) - VN_OFFSET_MS);
}

/** Chuyển "Từ ngày"/"Đến ngày" (chuỗi YYYY-MM-DD, cả 2 đầu đều BAO GỒM) thành
 * {start,end} mà repository dùng — `end` là mốc LOẠI TRỪ (không bao gồm),
 * nên phải +1 ngày so với "Đến ngày" người dùng chọn. */
export function toQueryRange(startInput: string, endInput: string): { start: Date; end: Date } {
  const start = parseVNDateInputValue(startInput);
  const end = new Date(parseVNDateInputValue(endInput).getTime() + ONE_DAY_MS);
  return { start, end };
}

/** Ngược lại toQueryRange — dùng để hiện "Đến ngày" (bao gồm) từ `end` loại trừ. */
export function toInclusiveEndDateInputValue(end: Date): string {
  return formatVNDateInputValue(new Date(end.getTime() - ONE_DAY_MS));
}
