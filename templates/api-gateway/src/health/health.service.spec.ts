import { ConfigService } from "@nestjs/config";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns ok health payload", () => {
    const config = {
      get: (key: string, fallback?: string) => (key === "SERVICE_NAME" ? "n0-api-gateway" : fallback),
    } as unknown as ConfigService;
    const service = new HealthService(config);
    expect(service.getHealth().status).toBe("ok");
    expect(service.getHealth().role).toBe("gateway");
  });
});
