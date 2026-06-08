export interface ProxyRoute {
  /** Incoming path prefix on the gateway (must start with /api). */
  path: string;
  /** Env var holding upstream base URL, e.g. http://127.0.0.1:4000 */
  targetEnv: string;
}

/**
 * Register upstream services here. FE only calls the gateway; traffic is
 * forwarded over the internal network (localhost / VPC / K8s DNS).
 */
export const PROXY_ROUTES: ProxyRoute[] = [
  { path: "/api/auth", targetEnv: "AUTH_SERVICE_URL" },
  { path: "/api/workspaces", targetEnv: "PROJECT_SERVICE_URL" },
];
