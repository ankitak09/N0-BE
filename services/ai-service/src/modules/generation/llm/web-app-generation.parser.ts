import { parseAiProjectManifest } from "../ai-project-manifest";
import type { GeneratedFile, LlmWebAppPayload } from "../generation.types";
import { BLOCKED_NPM_PACKAGES, sanitizeGeneratedFiles } from "../package-sanitize";

function extractFolders(filePaths: string[]): string[] {
  const folders = new Set<string>();
  for (const filePath of filePaths) {
    const parts = filePath.split("/").filter(Boolean);
    for (let index = 1; index < parts.length; index += 1) {
      folders.add(parts.slice(0, index).join("/"));
    }
  }
  return [...folders].sort((a, b) => a.localeCompare(b));
}

function normalizeHtmlEntrypoint(html: string): string {
  return html.replace(
    /<script\s+type=["']module["']\s+src=["'](?:\.\/)?(?:public\/)?(?:src\/)?main\.tsx["']\s*><\/script>/i,
    '<script type="module" src="/src/main.tsx"></script>',
  );
}

function normalizeViteConfig(files: GeneratedFile[]): void {
  const viteConfig = files.find((file) => file.path === "vite.config.ts");
  if (!viteConfig) {
    return;
  }

  // Some LLM outputs use a non-existent package name "tsconfig-paths-plugin".
  if (viteConfig.content.includes(`"tsconfig-paths-plugin"`) || viteConfig.content.includes(`'tsconfig-paths-plugin'`)) {
    viteConfig.content = viteConfig.content.replace(/(["'])tsconfig-paths-plugin\1/g, "$1vite-tsconfig-paths$1");
  }
}

function ensureViteTsconfigPathsDependency(files: GeneratedFile[]): void {
  const viteConfig = files.find((file) => file.path === "vite.config.ts");
  if (!viteConfig || !viteConfig.content.includes("vite-tsconfig-paths")) {
    return;
  }

  const packageJson = files.find((file) => file.path === "package.json");
  if (!packageJson) {
    return;
  }

  try {
    const parsed = JSON.parse(packageJson.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    parsed.devDependencies = parsed.devDependencies ?? {};
    if (!parsed.devDependencies["vite-tsconfig-paths"] && !(parsed.dependencies?.["vite-tsconfig-paths"])) {
      parsed.devDependencies["vite-tsconfig-paths"] = "^5.1.4";
    }

    packageJson.content = `${JSON.stringify(parsed, null, 2)}\n`;
  } catch {
    // Keep original file untouched if the model returned non-JSON package content.
  }
}

function normalizePackageJson(files: GeneratedFile[]): void {
  const packageJson = files.find((file) => file.path === "package.json");
  if (!packageJson) {
    return;
  }

  try {
    const parsed = JSON.parse(packageJson.content) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const cleanDeps = (deps?: Record<string, string>) =>
      Object.fromEntries(Object.entries(deps ?? {}).filter(([name]) => !BLOCKED_NPM_PACKAGES.has(name)));

    parsed.dependencies = cleanDeps(parsed.dependencies);
    parsed.devDependencies = cleanDeps(parsed.devDependencies);
    parsed.scripts = parsed.scripts ?? {};

    if (!parsed.scripts.build) {
      parsed.scripts.build = "vite build";
    }
    // Keep start deterministic for local run after build.
    parsed.scripts.start = "vite preview --host 0.0.0.0 --port 4173";

    packageJson.content = `${JSON.stringify(parsed, null, 2)}\n`;
  } catch {
    // Keep original file untouched if the model returned non-JSON package content.
  }
}

function ensureIndexHtml(files: GeneratedFile[]): GeneratedFile[] {
  const normalized = files.map((file) => ({ ...file }));
  const rootIndex = normalized.find((file) => file.path === "index.html");
  const publicIndex = normalized.find((file) => file.path === "public/index.html");

  if (rootIndex) {
    rootIndex.content = normalizeHtmlEntrypoint(rootIndex.content);
  } else if (publicIndex) {
    const content = normalizeHtmlEntrypoint(publicIndex.content);
    normalized.push({ path: "index.html", content });
    publicIndex.content = content;
  } else {
    normalized.push({
      path: "index.html",
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    });
  }

  normalizeViteConfig(normalized);
  normalizePackageJson(normalized);
  ensureViteTsconfigPathsDependency(normalized);
  return normalized;
}

export function parseLlmWebAppPayload(raw: unknown, prompt: string): LlmWebAppPayload {
  const manifest = parseAiProjectManifest(raw, prompt);
  const files = sanitizeGeneratedFiles(ensureIndexHtml(manifest.files));

  if (files.length === 0) {
    throw new Error("LLM response did not include any files");
  }

  return {
    ...manifest,
    files,
  };
}

export function foldersFromFiles(files: GeneratedFile[]): string[] {
  return extractFolders(files.map((file) => file.path));
}
