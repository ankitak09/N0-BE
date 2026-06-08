import type { ConfigService } from "@nestjs/config";

export type AppEnv = "development" | "qa" | "production";

export function resolveAppEnv(config: ConfigService): AppEnv {
  const explicit = config.get<string>("APP_ENV")?.trim().toLowerCase();
  if (explicit === "qa" || explicit === "staging") {
    return "qa";
  }
  if (explicit === "production" || explicit === "prod") {
    return "production";
  }
  if (explicit === "development" || explicit === "dev" || explicit === "local") {
    return "development";
  }

  const nodeEnv = config.get<string>("NODE_ENV")?.trim().toLowerCase() ?? "development";
  return nodeEnv === "production" ? "production" : "development";
}

export function isTemplateGenerationAllowed(config: ConfigService): boolean {
  return resolveAppEnv(config) !== "production";
}

/** true = AI/LLM, false = ecommerce template (only when template generation is allowed). */
export function resolveEffectiveGenerationMode(
  requested: boolean | undefined,
  config: ConfigService,
): boolean {
  if (!isTemplateGenerationAllowed(config)) {
    return true;
  }
  return requested === true;
}
