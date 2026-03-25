export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as ApiError).status === 'number' &&
    'message' in err &&
    typeof (err as ApiError).message === 'string'
  );
}
