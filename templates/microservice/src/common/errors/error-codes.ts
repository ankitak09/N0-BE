/** HTTP status codes returned in `error.code` for FE branching. */
export const ErrorCode = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  BAD_REQUEST: 400,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
