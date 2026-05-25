import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService) {}

  getHealth() {
    return {
      status: "ok",
      service: this.config.get<string>("SERVICE_NAME", "n0-api-gateway"),
      role: "gateway",
      version: this.config.get<string>("SERVICE_VERSION", "0.1.0"),
      timestamp: new Date().toISOString(),
    };
  }

  getReadiness() {
    return {
      status: "ready",
      service: this.config.get<string>("SERVICE_NAME", "n0-api-gateway"),
      role: "gateway",
      timestamp: new Date().toISOString(),
    };
  }
}
