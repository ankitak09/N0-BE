import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../decorators/public.decorator";
import { HealthService } from "./health.service";

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get("health")
  health() {
    return this.healthService.getHealth();
  }

  @Public()
  @Get("ready")
  ready() {
    return this.healthService.getReadiness();
  }
}
