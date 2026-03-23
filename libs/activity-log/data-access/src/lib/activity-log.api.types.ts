export interface ActivityLogParams {
  action?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/** Typed as unknown[] until the backend OpenAPI schema is enriched for this endpoint. */
export type ActivityLogList = unknown[];
