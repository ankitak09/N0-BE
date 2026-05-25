import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { NextFunction, Response } from "express";
import { apiError } from "../common/api-error";
import { ErrorCode } from "../common/errors";
import { RequestWithId } from "../middleware/request-id.middleware";

type GatewayRequest = RequestWithId & {
  userId?: string;
  email?: string;
};

/** Routes that bypass JWT at the gateway (auth signup + platform health). */
const PUBLIC_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/api\/health$/ },
  { method: "GET", pattern: /^\/api\/ready$/ },
  { method: "POST", pattern: /^\/api\/auth\/signup\/request$/ },
  { method: "POST", pattern: /^\/api\/auth\/signup\/complete$/ },
  { method: "POST", pattern: /^\/api\/auth\/verify-email$/ },
];

function isPublicRoute(method: string, path: string): boolean {
  return PUBLIC_ROUTES.some((r) => r.method === method && r.pattern.test(path));
}

export function registerGatewayAuth(app: INestApplication) {
  const jwt = app.get(JwtService);
  const config = app.get(ConfigService);
  const server = app.getHttpAdapter().getInstance();

  server.use((req: GatewayRequest, res: Response, next: NextFunction) => {
    const path = req.path ?? req.url.split("?")[0];

    if (isPublicRoute(req.method, path) || !path.startsWith("/api/")) {
      return next();
    }

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json(apiError(ErrorCode.UNAUTHORIZED, "Bearer token required", req.requestId));
    }

    try {
      const payload = jwt.verify<{ sub: string; email?: string }>(header.slice(7), {
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
      req.userId = payload.sub;
      req.email = payload.email;
      return next();
    } catch {
      return res
        .status(401)
        .json(apiError(ErrorCode.UNAUTHORIZED, "Invalid or expired access token", req.requestId));
    }
  });
}
