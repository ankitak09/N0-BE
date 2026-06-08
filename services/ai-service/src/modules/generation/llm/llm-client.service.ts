import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseJsonFromLlmContent } from "./json-response.parser";
import { formatFetchError, llmHttpRequest } from "./llm-fetch";
import { resolveProviderKind, type LlmProviderKind } from "./llm-provider";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `You are an expert frontend engineer. Return ONLY valid JSON (no markdown, no code fences):
{
  "contractVersion": "1",
  "projectName": "string",
  "framework": "react-vite",
  "dependencies": ["npm-package-name"],
  "environmentVariables": [{ "key": "VITE_*", "value": "" }],
  "screens": [{ "name": "string", "routePath": "/path", "order": 1, "description": "string" }],
  "files": [{ "path": "relative/path.ext", "content": "full source code" }]
}
Escape newlines inside file content as \\n. Include package.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, src/index.css, and src/pages/* with CSS.
Use react-router-dom for multi-page apps.
Package rules (strict): only real npm packages; do NOT invent package names. Never include @types/vite or tsconfig-paths-plugin.
Scripts rules (strict): package.json must include build="vite build" and start="vite preview --host 0.0.0.0 --port 4173".`;

const SYSTEM_PROMPT_COMPACT = `Return ONLY valid JSON (no markdown). Escape newlines in file content as \\n.
{
  "suggestedProjectName": "string",
  "screens": [{ "name": "string", "routePath": "/", "order": 1, "description": "string" }],
  "files": [{ "path": "path", "content": "source" }]
}
You MUST match the user's prompt: use the exact pages, routes, and copy they ask for (not a generic template).
Generate a Vite+React+TS app: package.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, src/index.css, and src/pages/* with CSS. Use react-router-dom.
Only use real npm packages; never include @types/vite or tsconfig-paths-plugin.
Set scripts: build="vite build", start="vite preview --host 0.0.0.0 --port 4173".`;

@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);
  private cachedProvider: LlmProviderKind | null = null;
  private ollamaChecked = false;
  private ollamaReachable = false;

  constructor(private readonly config: ConfigService) {}

  async getActiveProvider(): Promise<LlmProviderKind> {
    if (this.cachedProvider) {
      return this.cachedProvider;
    }

    if (!this.ollamaChecked) {
      this.ollamaReachable = await this.checkOllama();
      this.ollamaChecked = true;
    }

    this.cachedProvider = resolveProviderKind({
      explicit: this.config.get<string>("AI_PROVIDER"),
      hasOpenAiKey: Boolean(this.config.get<string>("OPENAI_API_KEY")?.trim()),
      hasGroqKey: Boolean(this.config.get<string>("GROQ_API_KEY")?.trim()),
      ollamaReachable: this.ollamaReachable,
    });

    this.logger.log(`Using AI provider: ${this.cachedProvider}`);
    return this.cachedProvider;
  }

  async completeWebAppJson(prompt: string): Promise<Record<string, unknown>> {
    const provider = await this.getActiveProvider();
    if (provider === "local") {
      throw new Error("LOCAL_PROVIDER_USE_LOCAL_GENERATOR");
    }

    const useCompact = provider === "groq" || provider === "ollama";
    const systemContent = useCompact ? SYSTEM_PROMPT_COMPACT : SYSTEM_PROMPT;
    const messages: ChatMessage[] = [
      { role: "system", content: systemContent },
      { role: "user", content: `Build a web application for:\n\n${prompt}` },
    ];

    if (provider === "ollama") {
      return this.completeViaOllama(messages);
    }
    if (provider === "groq") {
      return this.completeViaGroq(messages);
    }
    return this.completeViaOpenAiCompatible(messages);
  }

  private async checkOllama(): Promise<boolean> {
    const base = (this.config.get<string>("OLLAMA_BASE_URL") ?? "http://127.0.0.1:11434").replace(
      /\/$/,
      "",
    );
    try {
      const response = await fetch(`${base}/api/tags`, {
        signal: AbortSignal.timeout(2500),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async completeViaOllama(messages: ChatMessage[]): Promise<Record<string, unknown>> {
    const baseUrl = (this.config.get<string>("OLLAMA_BASE_URL") ?? "http://127.0.0.1:11434").replace(
      /\/$/,
      "",
    );
    const model = this.config.get<string>("OLLAMA_MODEL") ?? "llama3.2";
    const timeoutMs = Number(this.config.get<string>("OLLAMA_TIMEOUT_MS") ?? 300_000);

    const content = await this.postChatCompletions(
      `${baseUrl}/v1/chat/completions`,
      {
        Authorization: "Bearer ollama",
        "Content-Type": "application/json",
      },
      { model, temperature: 0.2, stream: false, messages },
      timeoutMs,
    );

    return parseJsonFromLlmContent(content) as Record<string, unknown>;
  }

  private async completeViaGroq(messages: ChatMessage[]): Promise<Record<string, unknown>> {
    const apiKey = this.config.get<string>("GROQ_API_KEY")?.trim();
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const baseUrl = (this.config.get<string>("GROQ_BASE_URL") ?? "https://api.groq.com/openai/v1").replace(
      /\/$/,
      "",
    );
    const model = this.config.get<string>("GROQ_MODEL") ?? "llama-3.1-8b-instant";
    const timeoutMs = Number(this.config.get<string>("GROQ_TIMEOUT_MS") ?? 120_000);

    const content = await this.postChatCompletions(
      `${baseUrl}/chat/completions`,
      {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      {
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      },
      timeoutMs,
    );

    return parseJsonFromLlmContent(content) as Record<string, unknown>;
  }

  private async completeViaOpenAiCompatible(messages: ChatMessage[]): Promise<Record<string, unknown>> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const baseUrl = (this.config.get<string>("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    );
    const model = this.config.get<string>("OPENAI_MODEL") ?? "gpt-4o-mini";
    const timeoutMs = Number(this.config.get<string>("OPENAI_TIMEOUT_MS") ?? 180_000);

    const content = await this.postChatCompletions(
      `${baseUrl}/chat/completions`,
      {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      {
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      },
      timeoutMs,
    );

    return parseJsonFromLlmContent(content) as Record<string, unknown>;
  }

  private allowInsecureTls(): boolean {
    const value =
      this.config.get<string>("LLM_TLS_REJECT_UNAUTHORIZED") ??
      this.config.get<string>("GROQ_TLS_REJECT_UNAUTHORIZED");
    return value === "false" || value === "0";
  }

  private async postChatCompletions(
    url: string,
    headers: Record<string, string>,
    body: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const allowInsecureTls = this.allowInsecureTls();
    const bodyText = JSON.stringify(body);

    try {
      let lastError: unknown;
      let response;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          response = await llmHttpRequest(url, {
            method: "POST",
            headers,
            body: bodyText,
            allowInsecureTls,
            signal: controller.signal,
          });
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 600));
          }
        }
      }

      if (!response) {
        throw new Error(formatFetchError(lastError));
      }

      const payload = JSON.parse(response.text) as {
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? `LLM request failed (${response.status})`);
      }

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("LLM returned empty content");
      }
      return content;
    } catch (error) {
      if (error instanceof Error && error.message === "LLM request aborted") {
        throw new Error("LLM request timed out");
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(formatFetchError(error));
    } finally {
      clearTimeout(timeout);
    }
  }
}
