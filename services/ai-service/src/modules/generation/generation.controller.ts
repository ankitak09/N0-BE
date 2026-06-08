import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../decorators/public.decorator";
import { GenerateWebAppDto } from "./dto/generate-web-app.dto";
import { GenerationService } from "./generation.service";

@ApiTags("generation")
@Controller("internal/v1")
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Public()
  @Post("generate-web-app")
  generateWebApp(@Body() dto: GenerateWebAppDto) {
    return this.generationService.generateWebApp(dto);
  }

  @Public()
  @Get("generation/:jobId")
  getGenerationStatus(@Param("jobId") jobId: string) {
    return this.generationService.getGenerationStatus(jobId);
  }
}
