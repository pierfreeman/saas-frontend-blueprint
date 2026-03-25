export interface ActivityLogParams {
  action?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/** A single activity log entry as returned by the backend. */
export interface ActivityLogRecord {
  id: string;
  orgId: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string; // ISO 8601 from JSON
}

/** Paginated response from GET /organizations/:orgId/activity-log */
export interface ActivityLogList {
  logs: ActivityLogRecord[];
  total: number;
  limit: number;
  offset: number;
}
