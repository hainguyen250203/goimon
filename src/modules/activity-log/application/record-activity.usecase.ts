import type {
  ActivityLogRepository,
  RecordActivityParams,
} from "../domain/activity-log.repository";

export async function recordActivity(
  repository: ActivityLogRepository,
  params: RecordActivityParams,
): Promise<void> {
  return repository.record(params);
}
