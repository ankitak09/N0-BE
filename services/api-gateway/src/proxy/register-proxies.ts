import { INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { ClientRequest, IncomingMessage, ServerResponse } from "http";
import { corsHeadersForBrowser, stripUpstreamCorsHeaders } from "../infrastructure/platform-http";
import { ErrorCode } from "../common/errors";
import { RequestWithId } from "../middleware/request-id.middleware";
import { PROXY_ROUTES } from "./proxy.routes";

function isGenerationStreamPath(path: string): boolean {
  return /\/generation\/stream$/.test(path.split("?")[0] ?? "");
}

export function registerProxies(app: INestApplication) {
  const config = app.get(ConfigService);
  const logger = new Logger("ProxyRegistry");
  /** Routing to Proxies — registered on Nest app so they run before route handlers. */
  for (const route of PROXY_ROUTES) {
    const target = config.get<string>(route.targetEnv);
    if (!target) {
      logger.warn(`Skipping proxy ${route.path}: ${route.targetEnv} is not set`);
      continue;
    }

    logger.log(`Proxy ${route.path} -> ${target}`);

    app.use(
      route.path,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (path) => `${route.path}${path}`,
        proxyTimeout: 0,
        timeout: 0,
        on: {
          proxyReq: (proxyReq: ClientRequest, req) => {
            const request = req as RequestWithId;
            const path = request.url?.split("?")[0] ?? "";
            if (request.requestId) {
              proxyReq.setHeader("x-request-id", request.requestId);
            }
            const auth = request.headers.authorization;
            if (typeof auth === "string") {
              proxyReq.setHeader("Authorization", auth);
            }
            if (isGenerationStreamPath(path)) {
              proxyReq.setHeader("Accept", "text/event-stream");
              proxyReq.setHeader("Connection", "keep-alive");
            }
          },
          proxyRes: (proxyRes: IncomingMessage, req, res) => {
            const path = (req as RequestWithId).url?.split("?")[0] ?? "";
            const origin =
              typeof (req as RequestWithId).headers.origin === "string"
                ? (req as RequestWithId).headers.origin
                : undefined;

            stripUpstreamCorsHeaders(proxyRes.headers);
            proxyRes.headers["cross-origin-resource-policy"] = "cross-origin";
            if (origin) {
              Object.assign(proxyRes.headers, corsHeadersForBrowser(origin, config));
            }

            if (!isGenerationStreamPath(path)) {
              return;
            }
            const response = res as ServerResponse;
            response.setHeader("Cache-Control", "no-cache, no-transform");
            response.setHeader("Connection", "keep-alive");
            response.setHeader("X-Accel-Buffering", "no");
            delete proxyRes.headers["content-encoding"];
          },
          error: (err, req, res) => {
            logger.error(`Proxy error for ${route.path}: ${err.message}`);
            if ("writeHead" in res && typeof res.writeHead === "function") {
              const request = req as RequestWithId;
              const origin =
                typeof request.headers.origin === "string" ? request.headers.origin : undefined;
              res.writeHead(502, {
                "Content-Type": "application/json",
                "cross-origin-resource-policy": "cross-origin",
                ...corsHeadersForBrowser(origin, config),
              });
              res.end(
                JSON.stringify({
                  success: false,
                  error: {
                    code: ErrorCode.SERVICE_UNAVAILABLE,
                    message: `Upstream unavailable for ${route.path}`,
                  },
                }),
              );
            }
          },
        },
      }),
    );
  }
}
