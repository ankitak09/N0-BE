import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../decorators/public.decorator";
import { HealthService } from "./health.service";

@ApiTags("Health")
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get("health")
  @ApiOperation({ summary: "Liveness check" })
  @ApiOkResponse({ description: "Service is running" })
  health() {
    return this.healthService.getHealth();
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness check" })
  @ApiOkResponse({ description: "Service is ready to accept traffic" })
  async ready() {
    return this.healthService.getReadiness();
  }
}
