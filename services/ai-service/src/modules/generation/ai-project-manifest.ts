import type { EnvironmentVariable, GeneratedFile, GeneratedScreen, LlmWebAppPayload } from "./generation.types";

export const AI_PROJECT_CONTRACT_VERSION = "1" as const;
export const SUPPORTED_FRAMEWORK = "react-vite" as const;

const DEFAULT_PACKAGE_VERSIONS: Record<string, string> = {
  "@supabase/supabase-js": "^2.49.0",
  "react-router-dom": "^7.0.0",
  zustand: "^5.0.0",
  "@tanstack/react-query": "^5.62.0",
};

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function defaultPackageVersion(packageName: string): string {
  return DEFAULT_PACKAGE_VERSIONS[packageName] ?? "latest";
}

function mergePackageNames(
  target: Record<string, string>,
  packageNames: string[],
): void {
  for (const name of packageNames) {
    const trimmed = name.trim();
    if (!trimmed || target[trimmed]) {
      continue;
    }
    target[trimmed] = defaultPackageVersion(trimmed);
  }
}

export function mergeManifestDependenciesIntoFiles(
  files: GeneratedFile[],
  dependencies: string[] = [],
  devDependencies: string[] = [],
): GeneratedFile[] {
  if (dependencies.length === 0 && devDependencies.length === 0) {
    return files;
  }

  const next = files.map((file) => ({ ...file }));
  let packageJson = next.find((file) => file.path === "package.json");

  if (!packageJson) {
    packageJson = {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "generated-app",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: { dev: "vite", build: "vite build", start: "vite preview --host 0.0.0.0 --port 4173" },
          dependencies: {},
          devDependencies: {},
        },
        null,
        2,
      ),
    };
    next.unshift(packageJson);
  }

  try {
    const parsed = JSON.parse(packageJson.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    parsed.dependencies = parsed.dependencies ?? {};
    parsed.devDependencies = parsed.devDependencies ?? {};
    mergePackageNames(parsed.dependencies, dependencies);
    mergePackageNames(parsed.devDependencies, devDependencies);
    packageJson.content = `${JSON.stringify(parsed, null, 2)}\n`;
  } catch {
    // leave package.json unchanged if not valid JSON
  }

  return next;
}

const DEFAULT_VITE_ENV_KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

export function ensureDefaultEnvironmentVariables(
  environmentVariables: EnvironmentVariable[] | undefined,
  _prompt: string,
): EnvironmentVariable[] {
  const merged = [...(environmentVariables ?? [])];
  const existingKeys = new Set(merged.map((entry) => entry.key));

  for (const key of DEFAULT_VITE_ENV_KEYS) {
    if (!existingKeys.has(key)) {
      merged.push({ key, value: "" });
    }
  }

  return merged;
}

export function buildEnvFileContent(environmentVariables: EnvironmentVariable[]): string {
  return environmentVariables
    .map(({ key, value }) => {
      const safeKey = key.trim();
      if (!safeKey) {
        return "";
      }
      const escaped = value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
      return `${safeKey}="${escaped}"`;
    })
    .filter(Boolean)
    .join("\n")
    .concat("\n");
}

export function parseAiProjectManifest(raw: unknown, prompt: string): LlmWebAppPayload {
  const data = raw as Record<string, unknown>;

  const projectNameRaw =
    (typeof data.projectName === "string" && data.projectName.trim()) ||
    (typeof data.suggestedProjectName === "string" && data.suggestedProjectName.trim()) ||
    "";

  const suggestedProjectName =
    projectNameRaw || prompt.split(/\s+/).slice(0, 5).join(" ") || "Generated App";

  const frameworkRaw = typeof data.framework === "string" ? data.framework.trim() : "";
  const framework = frameworkRaw || SUPPORTED_FRAMEWORK;
  if (framework !== SUPPORTED_FRAMEWORK) {
    throw new Error(`Unsupported framework "${framework}". Only "${SUPPORTED_FRAMEWORK}" is supported in contract v1.`);
  }

  const description = typeof data.description === "string" ? data.description.trim() : undefined;

  const dependencies = Array.isArray(data.dependencies)
    ? data.dependencies.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const devDependencies = Array.isArray(data.devDependencies)
    ? data.devDependencies.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const environmentVariables: EnvironmentVariable[] = Array.isArray(data.environmentVariables)
    ? data.environmentVariables
        .map((item) => {
          const entry = item as Record<string, unknown>;
          const key = typeof entry.key === "string" ? entry.key.trim() : "";
          const value = typeof entry.value === "string" ? entry.value : "";
          return key ? { key, value } : null;
        })
        .filter((item): item is EnvironmentVariable => item !== null)
    : [];

  const screensRaw = Array.isArray(data.screens) ? data.screens : [];
  const screens: GeneratedScreen[] = screensRaw
    .map((item, index) => {
      const screen = item as Record<string, unknown>;
      const name = typeof screen.name === "string" ? screen.name : `Page ${index + 1}`;
      const routePath = typeof screen.routePath === "string" ? screen.routePath : "/";
      const order = typeof screen.order === "number" ? screen.order : index + 1;
      const screenDescription =
        typeof screen.description === "string" ? screen.description : `${name} screen`;
      return { name, routePath, order, description: screenDescription };
    })
    .sort((a, b) => a.order - b.order);

  const filesRaw = Array.isArray(data.files) ? data.files : [];
  if (filesRaw.length === 0) {
    throw new Error("Contract v1 requires at least one file");
  }

  const seenPaths = new Set<string>();
  const files: GeneratedFile[] = [];

  for (const item of filesRaw) {
    const file = item as Record<string, unknown>;
    const path = typeof file.path === "string" ? normalizePath(file.path) : "";
    if (!path) {
      throw new Error("File path cannot be empty");
    }
    if (file.content === null || file.content === undefined) {
      throw new Error(`File content cannot be null for path "${path}"`);
    }
    if (typeof file.content !== "string") {
      throw new Error(`File content must be a string for path "${path}"`);
    }
    if (seenPaths.has(path)) {
      throw new Error(`Duplicate file path rejected: "${path}"`);
    }
    seenPaths.add(path);
    files.push({ path, content: file.content });
  }

  const defaultScreens =
    screens.length > 0
      ? screens
      : [{ name: "Home", routePath: "/", order: 1, description: "Application home page" }];

  const contractVersion =
    data.contractVersion === AI_PROJECT_CONTRACT_VERSION || data.contractVersion === 1
      ? AI_PROJECT_CONTRACT_VERSION
      : projectNameRaw || frameworkRaw || dependencies.length > 0 || environmentVariables.length > 0
        ? AI_PROJECT_CONTRACT_VERSION
        : undefined;

  return {
    contractVersion,
    suggestedProjectName,
    framework,
    description,
    dependencies,
    devDependencies,
    environmentVariables: ensureDefaultEnvironmentVariables(environmentVariables, prompt),
    screens: defaultScreens,
    files: mergeManifestDependenciesIntoFiles(files, dependencies, devDependencies),
  };
}
