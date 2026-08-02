import { getDefaultVNMonthRange } from "~/lib/vn-date-range";
import type { ReportDateRange } from "../domain/report.entity";

/** Mặc định: đầu tháng hiện tại → hết hôm nay (bao gồm hôm nay), giờ VN. */
export function getDefaultReportRange(now = new Date()): ReportDateRange {
  return getDefaultVNMonthRange(now);
}
