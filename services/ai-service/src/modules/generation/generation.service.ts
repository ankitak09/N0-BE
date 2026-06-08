import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { GenerateWebAppDto } from "./dto/generate-web-app.dto";
import { GenerationJobStore } from "./generation-job.store";
import { WebAppGeneratorService } from "./llm/web-app-generator.service";

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly jobStore: GenerationJobStore,
    private readonly webAppGenerator: WebAppGeneratorService,
  ) {}

  async generateWebApp(dto: GenerateWebAppDto) {
    const existing = this.jobStore.get(dto.jobId);
    if (existing?.status === "running") {
      return this.jobStore.toStatusDto(existing);
    }

    const job = this.jobStore.create(dto.jobId);
    job.status = "running";
    job.message = "Starting generation session...";
    void this.runGenerationJob(job.jobId, dto.prompt, dto.context);
    return this.jobStore.toStatusDto(job);
  }

  getGenerationStatus(jobId: string) {
    const job = this.jobStore.get(jobId);
    if (!job) {
      throw new NotFoundException(`Generation job ${jobId} not found`);
    }
    return this.jobStore.toStatusDto(job);
  }

  private async runGenerationJob(
    jobId: string,
    prompt: string,
    context?: Record<string, unknown>,
  ) {
    try {
      await this.webAppGenerator.run(jobId, prompt, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      this.jobStore.update(jobId, {
        status: "failed",
        progress: 0,
        message: "Generation failed",
        error: message,
      });
      this.logger.error(`Generation failed for job ${jobId}: ${message}`);
    }
  }
}
