import { db } from "~/server/db";
import type {
  ActivityLogRepository,
  RecordActivityParams,
} from "../domain/activity-log.repository";
import { activityLog } from "./activity-log.schema";

export const activityLogDrizzleRepository: ActivityLogRepository = {
  async record(params: RecordActivityParams): Promise<void> {
    await db.insert(activityLog).values({
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? null,
    });
  },
};
