import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns ok health payload", () => {
    const config = {
      get: (key: string, fallback?: string) => (key === "SERVICE_NAME" ? "n0-project-service" : fallback),
    } as unknown as ConfigService;
    const dataSource = { query: jest.fn() } as unknown as DataSource;
    const service = new HealthService(config, dataSource);
    expect(service.getHealth().status).toBe("ok");
  });
});
