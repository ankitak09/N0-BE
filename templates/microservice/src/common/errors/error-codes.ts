/** Stable error codes the FE can branch on (i18n, retry, redirect). */
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
