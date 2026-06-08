import https from "node:https";
import { URL } from "node:url";

export type LlmHttpResponse = {
  ok: boolean;
  status: number;
  text: string;
};

export async function llmHttpRequest(
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    allowInsecureTls?: boolean;
    signal?: AbortSignal;
  },
): Promise<LlmHttpResponse> {
  const parsed = new URL(url);
  const method = init.method ?? "GET";
  const body = init.body;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: {
          ...init.headers,
          ...(body ? { "Content-Length": Buffer.byteLength(body, "utf8") } : {}),
        },
        rejectUnauthorized: !init.allowInsecureTls,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 500;
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({ ok: status >= 200 && status < 300, status, text });
        });
      },
    );

    const onAbort = () => {
      req.destroy(new Error("LLM request aborted"));
    };
    init.signal?.addEventListener("abort", onAbort, { once: true });

    req.on("error", (error) => {
      init.signal?.removeEventListener("abort", onAbort);
      reject(error);
    });

    req.on("close", () => {
      init.signal?.removeEventListener("abort", onAbort);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

export function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "LLM network request failed";
  }

  const cause = (error as { cause?: unknown }).cause;
  if (cause instanceof Error) {
    if (cause.message.includes("SELF_SIGNED_CERT_IN_CHAIN")) {
      return "TLS certificate rejected (corporate VPN/proxy). Set GROQ_TLS_REJECT_UNAUTHORIZED=false in .env for local dev.";
    }
    return cause.message;
  }

  if (error.message.includes("SELF_SIGNED_CERT_IN_CHAIN")) {
    return "TLS certificate rejected (corporate VPN/proxy). Set GROQ_TLS_REJECT_UNAUTHORIZED=false in .env for local dev.";
  }

  return error.message;
}
