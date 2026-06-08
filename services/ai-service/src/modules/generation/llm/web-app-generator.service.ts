import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { resolveAppEnv, resolveEffectiveGenerationMode } from "../../../common/generation-mode.policy";
import type { GenerateWebAppResult, LlmWebAppPayload } from "../generation.types";
import { GenerationJobStore } from "../generation-job.store";
import {
  buildEnvFileContent,
  ensureDefaultEnvironmentVariables,
  mergeManifestDependenciesIntoFiles,
} from "../ai-project-manifest";
import { TemplateLoaderService } from "../template-loader.service";
import { foldersFromFiles, parseLlmWebAppPayload } from "./web-app-generation.parser";
import { buildLocalWebAppPayload } from "./local-web-app.generator";
import { LlmClientService } from "./llm-client.service";
import type { LlmProviderKind } from "./llm-provider";

@Injectable()
export class WebAppGeneratorService {
  private readonly logger = new Logger(WebAppGeneratorService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly llm: LlmClientService,
    private readonly jobStore: GenerationJobStore,
    private readonly templates: TemplateLoaderService,
  ) {}

  async run(
    jobId: string,
    prompt: string,
    context?: Record<string, unknown>,
  ): Promise<GenerateWebAppResult> {
    const useAi = resolveEffectiveGenerationMode(context?.generationMode === true, this.config);
    if (context?.generationMode === false && useAi) {
      this.logger.warn(
        `Job ${jobId}: template generation blocked in ${resolveAppEnv(this.config)}; using AI`,
      );
    }

    this.jobStore.update(jobId, {
      status: "running",
      progress: 5,
      message: useAi
        ? "Starting AI generation..."
        : "Loading ecommerce template...",
    });

    this.logger.log(`Generation started for job ${jobId} (generationMode=${useAi})`);

    let templateId: GenerateWebAppResult["templateId"];
    let payload: LlmWebAppPayload;

    if (!useAi) {
      templateId = "ecommerce";
      payload = await this.buildTemplatePayload(jobId, prompt);
    } else {
      const provider = await this.llm.getActiveProvider();
      this.jobStore.update(jobId, {
        progress: 8,
        message: `Starting generation (${this.providerLabel(provider)})...`,
      });

      if (provider === "local") {
        templateId = "local-generated";
        payload = await this.buildLocalPayload(jobId, prompt);
      } else {
        const llmPayload = await this.buildLlmPayload(jobId, prompt, provider);
        if (llmPayload) {
          templateId = "llm-generated";
          payload = llmPayload;
        } else {
          this.logger.warn(`LLM generation failed for job ${jobId}, falling back to built-in generator`);
          templateId = "local-generated";
          this.jobStore.update(jobId, {
            progress: 18,
            message:
              "AI request failed (check network/API key). Building pages from your prompt with built-in generator...",
          });
          payload = await this.buildLocalPayload(jobId, prompt);
        }
      }
    }

    return this.writePayloadToDisk(jobId, prompt, payload, templateId);
  }

  private async buildTemplatePayload(jobId: string, prompt: string) {
    this.jobStore.update(jobId, {
      progress: 25,
      message: "Loading ecommerce demo template...",
    });
    await this.sleep(300);
    return this.templates.buildEcommercePayload(prompt);
  }

  private async buildLocalPayload(jobId: string, prompt: string) {
    this.jobStore.update(jobId, {
      progress: 20,
      message: "Planning project structure (free local generator)...",
    });
    await this.sleep(400);
    return buildLocalWebAppPayload(prompt);
  }

  private async buildLlmPayload(
    jobId: string,
    prompt: string,
    provider: LlmProviderKind,
  ): Promise<ReturnType<typeof parseLlmWebAppPayload> | null> {
    const connectingMessage =
      provider === "ollama"
        ? "Connecting to Ollama..."
        : provider === "groq"
          ? "Connecting to Groq (free AI)..."
          : "Connecting to AI...";

    this.jobStore.update(jobId, {
      progress: 10,
      message: connectingMessage,
    });

    try {
      const raw = await this.llm.completeWebAppJson(prompt);

      this.jobStore.update(jobId, {
        progress: 35,
        message: "Planning project structure...",
      });

      return parseLlmWebAppPayload(raw, prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "LLM request failed";
      this.logger.warn(`LLM payload build failed for job ${jobId}: ${message}`);
      return null;
    }
  }

  private async writePayloadToDisk(
    jobId: string,
    prompt: string,
    payload: ReturnType<typeof parseLlmWebAppPayload>,
    templateId: GenerateWebAppResult["templateId"],
  ): Promise<GenerateWebAppResult> {
    const materialized: ReturnType<typeof parseLlmWebAppPayload> = {
      ...payload,
      environmentVariables: ensureDefaultEnvironmentVariables(
        payload.environmentVariables,
        prompt,
      ),
      files: mergeManifestDependenciesIntoFiles(
        payload.files,
        payload.dependencies ?? [],
        payload.devDependencies ?? [],
      ),
    };

    const outputRoot =
      this.config.get<string>("AI_GENERATED_OUTPUT_DIR") ??
      path.resolve(process.cwd(), "generated");
    const outputDir = path.join(outputRoot, jobId);
    const writeDelayMs = Number(this.config.get<string>("AI_FILE_WRITE_DELAY_MS") ?? 120);
    const knownFolders = new Set<string>();
    const folders = foldersFromFiles(materialized.files);

    await mkdir(outputDir, { recursive: true });
    this.jobStore.update(jobId, {
      outputDir,
      message: `Creating ${folders.length} folders and ${materialized.files.length} files...`,
      progress: 40,
    });

    for (const folderPath of folders) {
      if (knownFolders.has(folderPath)) {
        continue;
      }
      knownFolders.add(folderPath);
      await mkdir(path.join(outputDir, folderPath), { recursive: true });
      this.jobStore.addFolder(jobId, folderPath);
      this.jobStore.update(jobId, {
        message: `Created folder ${folderPath}/`,
        progress: Math.min(55, 40 + knownFolders.size * 2),
      });
      await this.sleep(writeDelayMs);
    }

    for (let index = 0; index < materialized.files.length; index += 1) {
      const file = materialized.files[index];
      const targetPath = path.join(outputDir, file.path);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, file.content, "utf8");

      this.jobStore.addFile(jobId, {
        path: file.path,
        size: Buffer.byteLength(file.content, "utf8"),
        createdAt: new Date().toISOString(),
      });

      const progress = Math.min(95, 55 + Math.round(((index + 1) / materialized.files.length) * 40));
      this.jobStore.update(jobId, {
        progress,
        message: `Created ${file.path}`,
        currentFile: file.path,
      });

      await this.sleep(writeDelayMs);
    }

    const envContent = buildEnvFileContent(materialized.environmentVariables ?? []);
    await writeFile(path.join(outputDir, ".env"), envContent, "utf8");
    this.jobStore.addFile(jobId, {
      path: ".env",
      size: Buffer.byteLength(envContent, "utf8"),
      createdAt: new Date().toISOString(),
    });
    this.jobStore.update(jobId, { message: "Created .env", progress: 97 });

    const result: GenerateWebAppResult = {
      suggestedProjectName: materialized.suggestedProjectName,
      templateId,
      previewBasePath: materialized.screens[0]?.routePath ?? "/",
      screens: materialized.screens,
    };

    this.jobStore.update(jobId, {
      status: "completed",
      progress: 100,
      message: "Generation complete",
      currentFile: undefined,
      result,
    });

    this.logger.log(`Generation completed for job ${jobId} (${materialized.files.length} files, ${templateId})`);
    return result;
  }

  private providerLabel(provider: LlmProviderKind): string {
    switch (provider) {
      case "ollama":
        return "Ollama (free, local)";
      case "groq":
        return "Groq (free cloud AI)";
      case "local":
        return "built-in (free, offline)";
      default:
        return "cloud LLM";
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
