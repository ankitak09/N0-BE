import { ApiMeta } from "./api-response";

/** Standard error envelope returned to the Next.js FE. */
export interface ApiErrorBody {
  code: number;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  meta: ApiMeta;
}

export function apiError(
  code: number,
  message: string,
  requestId?: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    meta: {
      ...(requestId ? { requestId } : {}),
      timestamp: new Date().toISOString(),
    },
  };
}
