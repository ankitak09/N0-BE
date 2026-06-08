import { Injectable, Optional, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  getHealth() {
    return {
      status: "ok",
      service: this.config.get<string>("SERVICE_NAME", "n0-project-service"),
      version: this.config.get<string>("SERVICE_VERSION", "0.1.0"),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    if (!this.dataSource?.isInitialized) {
      return {
        status: "ready",
        service: this.config.get<string>("SERVICE_NAME", "n0-project-service"),
        database: "skipped",
        kafka: this.config.get("ENABLE_KAFKA") === "true" ? "enabled" : "disabled",
        timestamp: new Date().toISOString(),
      };
    }

    try {
      await this.dataSource.query("SELECT 1");
      return {
        status: "ready",
        service: this.config.get<string>("SERVICE_NAME", "n0-project-service"),
        database: "connected",
        kafka: this.config.get("ENABLE_KAFKA") === "true" ? "enabled" : "disabled",
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "not_ready",
        service: this.config.get<string>("SERVICE_NAME", "n0-project-service"),
        database: "disconnected",
      });
    }
  }
}
