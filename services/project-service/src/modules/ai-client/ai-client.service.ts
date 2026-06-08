import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type GeneratedFileRecord = {
  path: string;
  size: number;
  createdAt: string;
};

type GenerateWebAppResult = {
  suggestedProjectName: string;
  templateId: string;
  previewBasePath: string;
  screens: Array<{
    name: string;
    routePath: string;
    order: number;
    description?: string;
  }>;
};

type GenerateWebAppResponse = {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  currentFile?: string;
  filesCreated: GeneratedFileRecord[];
  foldersCreated?: string[];
  result?: GenerateWebAppResult;
  error?: string;
};

export type GenerationPollUpdate = {
  progress: number;
  message: string;
  currentFile?: string;
  filesCreated: GeneratedFileRecord[];
  foldersCreated: string[];
};

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);

  constructor(private readonly config: ConfigService) {}

  async generateWebApp(
    input: {
      jobId: string;
      prompt: string;
      context?: Record<string, unknown>;
    },
    onProgress?: (update: GenerationPollUpdate) => void,
  ): Promise<GenerateWebAppResponse> {
    const aiServiceUrl = this.config.get<string>("AI_SERVICE_URL") ?? "http://127.0.0.1:4003";
    const baseUrl = aiServiceUrl.replace(/\/$/, "");

    const started = await this.postGenerate(baseUrl, input);
    if (started.status === "completed" && started.result) {
      onProgress?.({
        progress: 100,
        message: started.message,
        filesCreated: started.filesCreated ?? [],
        foldersCreated: started.foldersCreated ?? [],
      });
      return started;
    }

    if (started.status === "running" || started.status === "pending") {
      return await this.pollUntilComplete(baseUrl, input.jobId, onProgress);
    }

    if (started.status === "failed") {
      throw new Error(started.error ?? "AI generation request failed");
    }

    return started;
  }

  private async postGenerate(
    baseUrl: string,
    input: { jobId: string; prompt: string; context?: Record<string, unknown> },
  ): Promise<GenerateWebAppResponse> {
    const response = await fetch(`${baseUrl}/api/internal/v1/generate-web-app`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as { success?: boolean; data?: GenerateWebAppResponse; message?: string };
    if (!response.ok || body.success === false || !body.data) {
      const detail =
        typeof body.message === "string"
          ? body.message
          : (body as { error?: { message?: string } }).error?.message;
      throw new Error(detail ?? "AI generation request failed");
    }
    return body.data;
  }

  private async pollUntilComplete(
    baseUrl: string,
    jobId: string,
    onProgress?: (update: GenerationPollUpdate) => void,
  ): Promise<GenerateWebAppResponse> {
    const pollMs = Number(this.config.get<string>("AI_POLL_MS") ?? 400);
    const timeoutMs = Number(this.config.get<string>("AI_GENERATION_TIMEOUT_MS") ?? 300_000);
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const response = await fetch(`${baseUrl}/api/internal/v1/generation/${jobId}`);
      const body = (await response.json()) as { success?: boolean; data?: GenerateWebAppResponse };
      if (!response.ok || body.success === false || !body.data) {
        throw new Error("AI generation status request failed");
      }

      const status = body.data;
      onProgress?.({
        progress: status.progress,
        message: status.message,
        currentFile: status.currentFile,
        filesCreated: status.filesCreated ?? [],
        foldersCreated: status.foldersCreated ?? [],
      });

      if (status.status === "completed" && status.result) {
        return status;
      }
      if (status.status === "failed") {
        throw new Error(status.error ?? "AI generation failed");
      }

      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }

    throw new Error("AI generation timed out");
  }
}
