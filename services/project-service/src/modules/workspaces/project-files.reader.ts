import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export function resolveGeneratedProjectRoot(projectId: string): string | null {
  const jobId = `gen_${projectId}`;
  const fromEnv = process.env.AI_GENERATED_OUTPUT_DIR?.trim();

  const candidates = [
    fromEnv ? path.resolve(fromEnv, jobId) : null,
    path.resolve(process.cwd(), "../ai-service/generated", jobId),
    path.resolve(__dirname, "../../../ai-service/generated", jobId),
  ].filter((value): value is string => Boolean(value));

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function resolveProjectFilePath(projectId: string, filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    throw new Error("Invalid file path");
  }

  const root = resolveGeneratedProjectRoot(projectId);
  if (!root) {
    throw new Error("Generated project files not found");
  }

  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(path.resolve(root))) {
    throw new Error("Invalid file path");
  }

  if (!existsSync(absolute)) {
    throw new Error("File not found");
  }

  return absolute;
}

export async function readProjectFileContent(projectId: string, filePath: string): Promise<string> {
  const absolute = resolveProjectFilePath(projectId, filePath);
  return readFile(absolute, "utf8");
}
