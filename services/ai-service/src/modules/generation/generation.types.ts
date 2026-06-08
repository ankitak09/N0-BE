export type GeneratedScreen = {
  name: string;
  routePath: string;
  order: number;
  description: string;
};

export type GeneratedFile = {
  path: string;
  content: string;
};

export type EnvironmentVariable = {
  key: string;
  value: string;
};

export type GenerateWebAppResult = {
  suggestedProjectName: string;
  templateId: "llm-generated" | "local-generated" | "ecommerce";
  previewBasePath: string;
  screens: GeneratedScreen[];
};

export type LlmWebAppPayload = {
  /** Present when parsed as AI Project Response Contract v1 */
  contractVersion?: "1";
  suggestedProjectName: string;
  framework?: string;
  description?: string;
  dependencies?: string[];
  devDependencies?: string[];
  environmentVariables?: EnvironmentVariable[];
  screens: GeneratedScreen[];
  files: GeneratedFile[];
};
