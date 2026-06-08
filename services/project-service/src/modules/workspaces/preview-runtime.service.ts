import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { spawn, type ChildProcess } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { resolveGeneratedProjectRoot } from "./project-files.reader";

type PreviewRuntime = {
  port: number;
  proc: ChildProcess;
};

type PreviewPhaseMessage = "Installing dependencies..." | "Building app..." | "Starting preview server...";

/** Packages LLMs often hallucinate; they break Vite previews and npm install. */
const STRIP_NPM_PACKAGES = new Set([
  "css-loader",
  "style-loader",
  "webpack",
  "webpack-cli",
  "webpack-dev-server",
  "html-webpack-plugin",
  "babel-loader",
  "file-loader",
  "url-loader",
  "sass-loader",
  "less-loader",
  "postcss-loader",
  "mini-css-extract-plugin",
  "tsconfig-paths-plugin",
  "vite-plugin-react",
  "vite-plugin-react-refresh",
  "@types/react-router-dom",
  "@types/vite",
  "@supabase/supabase-js-auth",
  "sass-loader",
]);

@Injectable()
export class PreviewRuntimeService implements OnModuleDestroy {
  private readonly logger = new Logger(PreviewRuntimeService.name);
  private readonly runtimes = new Map<string, PreviewRuntime>();
  private readonly booting = new Map<string, Promise<string | undefined>>();

  async ensureProjectPreview(
    projectId: string,
    onPhase?: (message: PreviewPhaseMessage) => void,
  ): Promise<string | undefined> {
    const existing = this.runtimes.get(projectId);
    if (existing && existing.proc.exitCode == null && !existing.proc.killed) {
      return this.previewUrl(existing.port);
    }

    const inflight = this.booting.get(projectId);
    if (inflight) {
      return inflight;
    }

    const task = this.startProjectPreview(projectId, onPhase).catch((error) => {
      const message = error instanceof Error ? error.message : "Preview setup failed";
      this.logger.warn(`Preview setup failed for ${projectId}: ${message}`);
      return undefined;
    });
    this.booting.set(projectId, task);
    try {
      return await task;
    } finally {
      this.booting.delete(projectId);
    }
  }

  getLivePreviewUrl(projectId: string): string | undefined {
    const runtime = this.runtimes.get(projectId);
    if (!runtime || runtime.proc.exitCode != null || runtime.proc.killed) {
      return undefined;
    }
    return this.previewUrl(runtime.port);
  }

  private async startProjectPreview(
    projectId: string,
    onPhase?: (message: PreviewPhaseMessage) => void,
  ): Promise<string | undefined> {
    const projectRoot = resolveGeneratedProjectRoot(projectId);
    if (!projectRoot) {
      this.logger.warn(`Preview skipped: generated root not found for ${projectId}`);
      return undefined;
    }
    await this.normalizePackageJson(projectRoot);
    await this.normalizeIndexHtml(projectRoot);

    onPhase?.("Installing dependencies...");
    await this.installDependencies(projectRoot);

    onPhase?.("Building app...");
    await this.runShell(projectRoot, "npm run build");

    const port = await this.findOpenPort();
    onPhase?.("Starting preview server...");
    const command = [
      `(npm run start -- --host 0.0.0.0 --port ${port} --strictPort`,
      `|| npx vite preview --host 0.0.0.0 --port ${port} --strictPort) > .preview-dev.log 2>&1`,
    ].join(" ");
    const proc = spawn("sh", ["-lc", command], {
      cwd: projectRoot,
      stdio: "ignore",
      env: { ...process.env, NODE_ENV: "production" },
    });

    this.runtimes.set(projectId, { port, proc });
    proc.on("exit", () => {
      const runtime = this.runtimes.get(projectId);
      if (runtime?.proc === proc) {
        this.runtimes.delete(projectId);
      }
    });

    const started = await this.waitForPreview(port, proc, 90_000);
    if (!started) {
      this.logger.warn(`Preview failed to boot for ${projectId}`);
      return undefined;
    }
    return this.previewUrl(port);
  }

  private previewUrl(port: number): string {
    return `http://localhost:${port}`;
  }

  private async normalizePackageJson(projectRoot: string) {
    const packagePath = path.join(projectRoot, "package.json");
    let raw = "{}";
    try {
      raw = await readFile(packagePath, "utf8");
    } catch {
      // missing package.json is fine; we will create one below
    }

    let pkg: Record<string, unknown> = {};
    try {
      pkg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.logger.warn(`Invalid package.json in ${projectRoot}; rebuilding preview package manifest`);
    }

    const scripts = ((pkg.scripts as Record<string, string> | undefined) ?? {}) as Record<string, string>;
    scripts.dev = "vite";
    scripts.start = "vite preview";
    scripts.build = "vite build";

    const dependencies = ((pkg.dependencies as Record<string, string> | undefined) ?? {}) as Record<
      string,
      string
    >;
    const devDependencies = ((pkg.devDependencies as Record<string, string> | undefined) ?? {}) as Record<
      string,
      string
    >;

    for (const name of STRIP_NPM_PACKAGES) {
      delete dependencies[name];
      delete devDependencies[name];
    }

    // Vite belongs in devDependencies only (LLMs often put invalid copies in dependencies).
    const viteFromDeps = dependencies.vite;
    delete dependencies.vite;

    dependencies.react = dependencies.react ?? "^18.2.0";
    dependencies["react-dom"] = dependencies["react-dom"] ?? "^18.2.0";
    dependencies["react-router-dom"] = dependencies["react-router-dom"] ?? "^6.30.1";

    devDependencies.vite = devDependencies.vite ?? viteFromDeps ?? "^5.4.11";
    devDependencies.typescript = devDependencies.typescript ?? "^5.6.3";
    devDependencies["@types/react"] = devDependencies["@types/react"] ?? "^18.3.8";
    devDependencies["@types/react-dom"] = devDependencies["@types/react-dom"] ?? "^18.3.0";
    devDependencies["@vitejs/plugin-react"] = devDependencies["@vitejs/plugin-react"] ?? "^4.3.4";

    const normalized = {
      ...pkg,
      private: true,
      scripts,
      dependencies,
      devDependencies,
    };

    await writeFile(packagePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  }

  private async normalizeIndexHtml(projectRoot: string) {
    const rootIndex = path.join(projectRoot, "index.html");
    const publicIndex = path.join(projectRoot, "public", "index.html");

    const rewriteEntry = (html: string) =>
      html.replace(
        /<script\s+type=["']module["']\s+src=["'](?:\.\/)?(?:public\/)?(?:src\/)?main\.tsx["']\s*><\/script>/i,
        '<script type="module" src="/src/main.tsx"></script>',
      );

    try {
      const root = await readFile(rootIndex, "utf8");
      await writeFile(rootIndex, rewriteEntry(root), "utf8");
      return;
    } catch {
      // try public/index.html fallback below
    }

    try {
      const publicHtml = await readFile(publicIndex, "utf8");
      const normalized = rewriteEntry(publicHtml);
      await writeFile(publicIndex, normalized, "utf8");
      await writeFile(rootIndex, normalized, "utf8");
    } catch {
      await writeFile(
        rootIndex,
        `<!doctype html>
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
        "utf8",
      );
    }
  }

  private async waitForPreview(port: number, proc: ChildProcess, timeoutMs: number): Promise<boolean> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (proc.exitCode != null || proc.killed) {
        this.logger.warn(`Preview process exited before becoming ready on port ${port}`);
        return false;
      }
      try {
        const res = await fetch(this.previewUrl(port), { method: "GET" });
        if (res.ok) {
          return true;
        }
      } catch {
        // wait for the dev server to boot
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    return false;
  }

  private async runShell(cwd: string, command: string, captureOutput = false): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("sh", ["-lc", command], {
        cwd,
        stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "ignore",
        env: process.env,
      });
      let stderr = "";
      if (captureOutput && proc.stderr) {
        proc.stderr.on("data", (chunk: Buffer | string) => {
          stderr += chunk.toString();
        });
      }
      proc.on("error", reject);
      proc.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        const detail = stderr.trim() ? `: ${stderr.trim().slice(-500)}` : "";
        reject(new Error(`Command failed (${code ?? "unknown"}): ${command}${detail}`));
      });
    });
  }

  private async installDependencies(projectRoot: string): Promise<void> {
    try {
      await access(path.join(projectRoot, "node_modules"));
      return;
    } catch {
      // no node_modules yet; continue with install
    }

    const installCmd = "npm install --no-audit --no-fund --legacy-peer-deps";
    try {
      await this.runShell(projectRoot, `${installCmd} --silent`);
      return;
    } catch (firstError) {
      this.logger.warn(
        `Silent npm install failed for ${projectRoot}, retrying with verbose output: ${
          firstError instanceof Error ? firstError.message : "unknown"
        }`,
      );
    }

    await this.runShell(projectRoot, installCmd, true);
  }

  private findOpenPort(start = 5174): Promise<number> {
    const tryPort = (port: number, resolve: (value: number) => void, reject: (reason?: unknown) => void) => {
      const server = createServer();
      server.unref();
      server.on("error", () => {
        server.close();
        tryPort(port + 1, resolve, reject);
      });
      server.listen(port, "127.0.0.1", () => {
        const address = server.address();
        const selected = typeof address === "object" && address ? address.port : port;
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(selected);
        });
      });
    };

    return new Promise<number>((resolve, reject) => tryPort(start, resolve, reject));
  }

  onModuleDestroy() {
    for (const runtime of this.runtimes.values()) {
      runtime.proc.kill();
    }
    this.runtimes.clear();
  }
}
