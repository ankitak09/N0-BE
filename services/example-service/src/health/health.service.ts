import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  getHealth() {
    return {
      status: "ok",
      service: this.config.get<string>("SERVICE_NAME", "n0-example-service"),
      version: this.config.get<string>("SERVICE_VERSION", "0.1.0"),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    try {
      await this.dataSource.query("SELECT 1");
      return {
        status: "ready",
        service: this.config.get<string>("SERVICE_NAME", "n0-example-service"),
        database: "connected",
        kafka: this.config.get("ENABLE_KAFKA") === "true" ? "enabled" : "disabled",
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "not_ready",
        service: this.config.get<string>("SERVICE_NAME", "n0-example-service"),
        database: "disconnected",
      });
    }
  }
}
