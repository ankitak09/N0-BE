import { Module } from "@nestjs/common";
import { GenerationController } from "./generation.controller";
import { GenerationService } from "./generation.service";
import { GenerationJobStore } from "./generation-job.store";
import { LlmClientService } from "./llm/llm-client.service";
import { TemplateLoaderService } from "./template-loader.service";
import { WebAppGeneratorService } from "./llm/web-app-generator.service";

@Module({
  controllers: [GenerationController],
  providers: [
    GenerationService,
    GenerationJobStore,
    LlmClientService,
    WebAppGeneratorService,
    TemplateLoaderService,
  ],
})
export class GenerationModule {}
