/** Standard success envelope returned to the Next.js FE. */
export interface ApiMeta {
  requestId?: string;
  timestamp: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data?: T;
  meta: ApiMeta;
}

export function apiSuccess<T>(data?: T, message?: string, requestId?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    meta: {
      ...(requestId ? { requestId } : {}),
      timestamp: new Date().toISOString(),
    },
  };
}

export function isApiEnvelope(value: unknown): value is { success: boolean } {
  return typeof value === "object" && value !== null && "success" in value;
}
