export type LlmProviderKind = "openai" | "groq" | "ollama" | "local";

export function resolveProviderKind(input: {
  explicit?: string;
  hasOpenAiKey: boolean;
  hasGroqKey: boolean;
  ollamaReachable: boolean;
}): LlmProviderKind {
  const explicit = input.explicit?.trim().toLowerCase();
  if (
    explicit === "openai" ||
    explicit === "groq" ||
    explicit === "ollama" ||
    explicit === "local"
  ) {
    return explicit;
  }

  if (input.hasGroqKey) {
    return "groq";
  }
  if (input.hasOpenAiKey) {
    return "openai";
  }
  if (explicit === "auto" && input.ollamaReachable) {
    return "ollama";
  }
  return "local";
}
