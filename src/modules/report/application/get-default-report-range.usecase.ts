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
 * Mặc định: đầu tháng hiện tại → hết hôm nay (bao gồm hôm nay). `day + 1`
 * tự tràn sang tháng sau đúng nếu hôm nay là ngày cuối tháng — `Date.UTC`
 * xử lý overflow ngày/tháng theo chuẩn, không cần tự tính tháng sau thủ công.
 */
export function getDefaultReportRange(now = new Date()): ReportDateRange {
  const { year, month, day } = getVietnamYMD(now);
  return {
    start: vnDateToUtc(year, month, 1),
    end: vnDateToUtc(year, month, day + 1),
  };
}
