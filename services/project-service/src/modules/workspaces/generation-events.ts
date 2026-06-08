/** Stream events — FE should branch on `type` only (template-agnostic). */

export type GenerationFileRef = {
  path: string;
  size: number;
  createdAt: string;
};

export type GenerationScreenRef = {
  name: string;
  routePath: string;
  order: number;
  description?: string;
};

export type GenerationSessionStartEvent = {
  type: "session.start";
  jobId: string;
  projectId: string;
  prompt: string;
};

export type GenerationProgressEvent = {
  type: "progress";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  currentFile?: string;
  filesCreated: GenerationFileRef[];
  filesCount: number;
  previewUrl?: string;
};

export type GenerationFolderCreatedEvent = {
  type: "folder.created";
  path: string;
};

export type GenerationFileCreatedEvent = {
  type: "file.created";
  file: GenerationFileRef;
  filesCount: number;
};

export type GenerationSessionEndEvent = {
  type: "session.end";
  status: "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  filesCount: number;
  templateId?: string;
  previewUrl?: string;
  suggestedProjectName?: string;
  screens: GenerationScreenRef[];
};

export type GenerationStreamEvent =
  | GenerationSessionStartEvent
  | GenerationProgressEvent
  | GenerationFolderCreatedEvent
  | GenerationFileCreatedEvent
  | GenerationSessionEndEvent;
