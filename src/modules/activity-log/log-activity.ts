import { recordActivity } from "./application/record-activity.usecase";
import { activityLogDrizzleRepository } from "./infrastructure/activity-log.drizzle-repository";
import type { RecordActivityParams } from "./domain/activity-log.repository";

/**
 * Tiện ích cho các router khác gọi ghi activity log sau 1 mutation thành
 * công, khỏi phải tự wire repository/usecase lặp lại ở từng nơi gọi.
 */
export function logActivity(params: RecordActivityParams): Promise<void> {
  return recordActivity(activityLogDrizzleRepository, params);
}
