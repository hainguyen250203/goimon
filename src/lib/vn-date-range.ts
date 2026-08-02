const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Chuỗi "YYYY-MM-DD" theo giờ Việt Nam — khớp `value` của `<input type="date">`. */
export function formatVNDateInputValue(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

/** Đầu ngày (00:00 giờ VN) của 1 chuỗi "YYYY-MM-DD". */
export function parseVNDateInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) - VN_OFFSET_MS);
}

/** Đầu ngày KẾ TIẾP (giờ VN) — mốc LOẠI TRỪ dùng làm cận trên cho 1 field
 * "Đến ngày" độc lập (không đi kèm "Từ ngày" bắt buộc như toQueryRange). */
export function endOfVNDayExclusive(value: string): Date {
  return new Date(parseVNDateInputValue(value).getTime() + ONE_DAY_MS);
}

/** Chuyển "Từ ngày"/"Đến ngày" (chuỗi YYYY-MM-DD, cả 2 đầu đều BAO GỒM) thành
 * {start,end} mà repository dùng — `end` là mốc LOẠI TRỪ (không bao gồm),
 * nên phải +1 ngày so với "Đến ngày" người dùng chọn. */
export function toQueryRange(startInput: string, endInput: string): { start: Date; end: Date } {
  return { start: parseVNDateInputValue(startInput), end: endOfVNDayExclusive(endInput) };
}

/** Ngược lại toQueryRange — dùng để hiện "Đến ngày" (bao gồm) từ `end` loại trừ. */
export function toInclusiveEndDateInputValue(end: Date): string {
  return formatVNDateInputValue(new Date(end.getTime() - ONE_DAY_MS));
}

function getVietnamYMD(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

/**
 * Mặc định: đầu tháng hiện tại → hết hôm nay (bao gồm hôm nay), giờ VN.
 * `day + 1` tự tràn sang tháng sau đúng nếu hôm nay là ngày cuối tháng —
 * `Date.UTC` xử lý overflow ngày/tháng theo chuẩn, không cần tự tính tháng
 * sau thủ công. Dùng chung cho báo cáo (`bao-cao`) và mọi filter khoảng
 * ngày muốn mặc định "trong tháng" (vd nhật ký hoạt động).
 */
export function getDefaultVNMonthRange(now = new Date()): { start: Date; end: Date } {
  const { year, month, day } = getVietnamYMD(now);
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - VN_OFFSET_MS),
    end: new Date(Date.UTC(year, month - 1, day + 1) - VN_OFFSET_MS),
  };
}
