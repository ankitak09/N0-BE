import type { INestApplication } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import type { IncomingHttpHeaders } from "http";
import helmet from "helmet";

export function isProductionEnv(config: ConfigService): boolean {
  return (config.get<string>("NODE_ENV") ?? "development") === "production";
}

/** Helmet defaults block cross-port API reads (CORP same-origin). */
export function applyPlatformSecurity(app: INestApplication): void {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
}

export function buildPlatformCorsOptions(config: ConfigService): CorsOptions {
  const corsOrigin = config.get<string>("CORS_ORIGIN") ?? "http://localhost:3000";
  const allowedOrigins = corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = isProductionEnv(config);

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (!isProduction) {
        callback(null, true);
        return;
      }
      const isConfigured = allowedOrigins.includes(origin);
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isPrivateLan =
        /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
          origin,
        );
      callback(null, isConfigured || isLocalhost || isPrivateLan);
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "Accept"],
    exposedHeaders: ["x-request-id"],
  };
}

export function applyPlatformCors(app: INestApplication, config: ConfigService): void {
  app.enableCors(buildPlatformCorsOptions(config));
}

const UPSTREAM_CORS_HEADER_KEYS = [
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "access-control-expose-headers",
  "access-control-max-age",
] as const;

/** Gateway owns browser CORS; strip upstream duplicates that break preflight. */
export function stripUpstreamCorsHeaders(headers: IncomingHttpHeaders): void {
  for (const key of UPSTREAM_CORS_HEADER_KEYS) {
    delete headers[key];
  }
}

export function corsHeadersForBrowser(
  originHeader: string | undefined,
  config: ConfigService,
): Record<string, string> {
  if (!originHeader) {
    return {};
  }
  const corsOrigin = config.get<string>("CORS_ORIGIN") ?? "http://localhost:3000";
  const allowedOrigins = corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = isProductionEnv(config);
  const isAllowed =
    !isProduction ||
    allowedOrigins.includes("*") ||
    allowedOrigins.includes(originHeader) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(originHeader);

  if (!isAllowed) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": originHeader,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}
