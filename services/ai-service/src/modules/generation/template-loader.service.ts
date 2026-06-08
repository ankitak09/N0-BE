import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GeneratedFile } from "./generation.types";
import { parseLlmWebAppPayload } from "./llm/web-app-generation.parser";

export const ECOMMERCE_TEMPLATE_ID = "ecommerce" as const;

type ManifestMeta = {
  contractVersion?: string;
  projectName?: string;
  framework?: string;
  description?: string;
  dependencies?: string[];
  devDependencies?: string[];
  environmentVariables?: Array<{ key: string; value: string }>;
  screens?: Array<{
    name: string;
    routePath: string;
    order: number;
    description?: string;
  }>;
};

@Injectable()
export class TemplateLoaderService {
  private readonly logger = new Logger(TemplateLoaderService.name);

  constructor(private readonly config: ConfigService) {}

  async buildEcommercePayload(prompt: string) {
    const templateRoot = this.resolveTemplateRoot();
    const manifestPath = path.join(templateRoot, "manifest.json");
    const meta = JSON.parse(await readFile(manifestPath, "utf8")) as ManifestMeta;
    const files = await this.loadProjectFiles(templateRoot);
    const payload = parseLlmWebAppPayload({ ...meta, files }, prompt);

    this.logger.log(
      `Loaded template ${ECOMMERCE_TEMPLATE_ID}: ${payload.files.length} files, project="${payload.suggestedProjectName}"`,
    );
    return payload;
  }

  private resolveTemplateRoot(): string {
    const fromEnv = this.config.get<string>("AI_TEMPLATE_DIR")?.trim();
    const templateId = ECOMMERCE_TEMPLATE_ID;
    const candidates = [
      fromEnv ? path.resolve(fromEnv) : null,
      path.resolve(process.cwd(), "templates", templateId),
      path.resolve(__dirname, "../../../templates", templateId),
      path.resolve(__dirname, "../../../../templates", templateId),
    ].filter((value): value is string => Boolean(value));

    const found = candidates.find((candidate) => existsSync(path.join(candidate, "manifest.json")));
    if (!found) {
      throw new Error(
        `Template "${templateId}" not found. Checked: ${candidates.join(", ")}`,
      );
    }
    return found;
  }

  private async loadProjectFiles(templateRoot: string): Promise<GeneratedFile[]> {
    const projectDir = path.join(templateRoot, "project");
    if (!existsSync(projectDir)) {
      throw new Error(`Template project directory missing: ${projectDir}`);
    }
    return this.readFilesRecursive(projectDir, projectDir);
  }

  private async readFilesRecursive(rootDir: string, currentDir: string): Promise<GeneratedFile[]> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    const files: GeneratedFile[] = [];
    const skipDirs = new Set(["node_modules", "dist", ".git"]);

    for (const entry of entries) {
      if (entry.isDirectory() && skipDirs.has(entry.name)) {
        continue;
      }
      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.readFilesRecursive(rootDir, absolute)));
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const relative = path.relative(rootDir, absolute).replace(/\\/g, "/");
      const content = await readFile(absolute, "utf8");
      files.push({ path: relative, content });
    }

    return files.sort((a, b) => a.path.localeCompare(b.path));
  }
}
