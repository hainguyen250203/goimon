import type { ReportDateRange } from "../domain/report.entity";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

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

function vnDateToUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - VN_OFFSET_MS);
}

/**
 * Mặc định: đầu tháng hiện tại → hết hôm qua (loại hôm nay vì chưa xong
 * ngày). Nếu hôm nay là ngày 1, "đầu tháng → hôm qua" sẽ rỗng/vô nghĩa —
 * lùi về xem trọn tháng trước.
 */
export function getDefaultReportRange(now = new Date()): ReportDateRange {
  const { year, month, day } = getVietnamYMD(now);
  const startOfThisMonth = vnDateToUtc(year, month, 1);

  if (day === 1) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return { start: vnDateToUtc(prevYear, prevMonth, 1), end: startOfThisMonth };
  }

  return { start: startOfThisMonth, end: vnDateToUtc(year, month, day) };
}
