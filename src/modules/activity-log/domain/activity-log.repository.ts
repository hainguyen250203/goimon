export type RecordActivityParams = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export interface ActivityLogRepository {
  record(params: RecordActivityParams): Promise<void>;
}
