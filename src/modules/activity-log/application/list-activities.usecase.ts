import type {
  ActivityLogRepository,
  ListActivitiesParams,
  ListActivitiesResult,
} from "../domain/activity-log.repository";

export function listActivities(
  repository: ActivityLogRepository,
  params: ListActivitiesParams,
): Promise<ListActivitiesResult> {
  return repository.list(params);
}
