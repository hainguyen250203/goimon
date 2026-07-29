import { desc, eq, count } from "drizzle-orm";

import { db } from "~/server/db";
import { user } from "~/server/better-auth/schema";
import type {
  ActivityLogRepository,
  ListActivitiesParams,
  ListActivitiesResult,
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

  async list({ page, pageSize, entityType }: ListActivitiesParams): Promise<ListActivitiesResult> {
    const offset = (page - 1) * pageSize;
    const where = entityType ? eq(activityLog.entityType, entityType) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: activityLog.id,
          actorName: user.name,
          action: activityLog.action,
          entityType: activityLog.entityType,
          entityId: activityLog.entityId,
          metadata: activityLog.metadata,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .innerJoin(user, eq(activityLog.actorId, user.id))
        .where(where)
        .orderBy(desc(activityLog.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(activityLog).where(where),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        actorName: row.actorName ?? "",
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.createdAt,
      })),
      total: totalRows[0]?.value ?? 0,
    };
  },
};
