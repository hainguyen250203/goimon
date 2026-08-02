export type RecordActivityParams = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export type ListActivitiesParams = {
  page: number;
  pageSize: number;
  entityType?: string;
  actorId?: string;
  /** Mốc BAO GỒM. */
  dateFrom?: Date;
  /** Mốc LOẠI TRỪ. */
  dateTo?: Date;
};

/** Read model cho trang /quan-ly — kèm actorName (join sẵn), khác RecordActivityParams (write). */
export type ActivityLogEntry = {
  id: number;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type ListActivitiesResult = {
  items: ActivityLogEntry[];
  total: number;
};

export interface ActivityLogRepository {
  record(params: RecordActivityParams): Promise<void>;
  list(params: ListActivitiesParams): Promise<ListActivitiesResult>;
}
