import { INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ErrorCode } from "../common/errors";
import { RequestWithId } from "../middleware/request-id.middleware";
import { PROXY_ROUTES } from "./proxy.routes";

export function registerProxies(app: INestApplication) {
  const config = app.get(ConfigService);
  const logger = new Logger("ProxyRegistry");
  const server = app.getHttpAdapter().getInstance();

  /** Routing to Proxies */
  for (const route of PROXY_ROUTES) {
    const target = config.get<string>(route.targetEnv);
    if (!target) {
      logger.warn(`Skipping proxy ${route.path}: ${route.targetEnv} is not set`);
      continue;
    }

    logger.log(`Proxy ${route.path} -> ${target}`);

    server.use(
      route.path,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        on: {
          proxyReq: (proxyReq, req) => {
            const request = req as RequestWithId;
            if (request.requestId) {
              proxyReq.setHeader("x-request-id", request.requestId);
            }
            const auth = request.headers.authorization;
            if (typeof auth === "string") {
              proxyReq.setHeader("Authorization", auth);
            }
          },
          error: (err, _req, res) => {
            logger.error(`Proxy error for ${route.path}: ${err.message}`);
            if ("writeHead" in res && typeof res.writeHead === "function") {
              res.writeHead(502, { "Content-Type": "application/json" });
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
