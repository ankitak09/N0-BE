import { HttpStatus, INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { NextFunction, Response } from "express";
import { corsHeadersForBrowser } from "../infrastructure/platform-http";
import { apiError } from "../common/api-error";
import { ErrorCode } from "../common/errors";
import { RequestWithId } from "../middleware/request-id.middleware";

type GatewayRequest = RequestWithId & {
  userId?: string;
  email?: string;
};

/** Routes that bypass JWT at the gateway (platform health + public auth). */
const PUBLIC_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/api\/health$/ },
  { method: "GET", pattern: /^\/api\/ready$/ },
  { method: "GET", pattern: /^\/api\/auth\/oauth\/[^/]+\/start$/ },
  { method: "GET", pattern: /^\/api\/auth\/oauth\/[^/]+\/callback$/ },
];

const PUBLIC_AUTH_POST = new Set([
  "/api/auth/check-email",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/verify-human",
  "/api/auth/email/verification/send",
  "/api/auth/email/verification/confirm",
  "/api/auth/session/refresh",
  "/api/auth/logout",
  "/api/auth/password/forgot",
  "/api/auth/password/reset",
  "/api/auth/oauth/exchange",
]);

function isDemoWorkspaceRoute(path: string): boolean {
  return process.env.ENABLE_DEMO_AUTH_BYPASS === "true" && path.startsWith("/api/workspaces");
}

function isPublicRoute(method: string, path: string): boolean {
  if (isDemoWorkspaceRoute(path)) {
    return true;
  }
  if (PUBLIC_ROUTES.some((r) => r.method === method && r.pattern.test(path))) {
    return true;
  }
  return method === "POST" && PUBLIC_AUTH_POST.has(path);
}

function jsonWithCors(
  res: Response,
  config: ConfigService,
  req: GatewayRequest,
  status: number,
  body: unknown,
): void {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  for (const [key, value] of Object.entries(corsHeadersForBrowser(origin, config))) {
    res.setHeader(key, value);
  }
  res.setHeader("cross-origin-resource-policy", "cross-origin");
  res.status(status).json(body);
}

export function registerGatewayAuth(app: INestApplication) {
  const jwt = app.get(JwtService);
  const config = app.get(ConfigService);

  app.use((req: GatewayRequest, res: Response, next: NextFunction) => {
    const path = req.path ?? req.url.split("?")[0];

    if (isPublicRoute(req.method, path) || !path.startsWith("/api/")) {
      if (isDemoWorkspaceRoute(path)) {
        req.userId = "user_demo";
        req.email = "demo@n0.local";
      }
      return next();
    }

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return jsonWithCors(
        res,
        config,
        req,
        HttpStatus.UNAUTHORIZED,
        apiError(ErrorCode.UNAUTHORIZED, "Bearer token required", req.requestId),
      );
    }

    try {
      const payload = jwt.verify<{ sub: string; email?: string }>(header.slice(7), {
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
      req.userId = payload.sub;
      req.email = payload.email;
      return next();
    } catch {
      return jsonWithCors(
        res,
        config,
        req,
        HttpStatus.UNAUTHORIZED,
        apiError(ErrorCode.UNAUTHORIZED, "Invalid or expired access token", req.requestId),
      );
    }
  });
}
