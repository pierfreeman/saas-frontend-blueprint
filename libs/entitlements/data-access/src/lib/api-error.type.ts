/**
 * Standard error shape returned by the backend API.
 * Will migrate to @org/shared/util-error once that lib is created.
 */
export interface ApiError {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  method: string;
}
