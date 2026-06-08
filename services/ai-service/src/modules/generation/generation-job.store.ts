import type { GenerateWebAppResult } from "./generation.types";

export type GenerationJobStatus = "pending" | "running" | "completed" | "failed";

export type GeneratedFileRecord = {
  path: string;
  size: number;
  createdAt: string;
};

export type GenerationJob = {
  jobId: string;
  status: GenerationJobStatus;
  progress: number;
  message: string;
  files: GeneratedFileRecord[];
  folders: string[];
  currentFile?: string;
  result?: GenerateWebAppResult;
  error?: string;
  outputDir?: string;
};

export class GenerationJobStore {
  private readonly jobs = new Map<string, GenerationJob>();

  create(jobId: string): GenerationJob {
    const job: GenerationJob = {
      jobId,
      status: "pending",
      progress: 0,
      message: "Queued for generation...",
      files: [],
      folders: [],
    };
    this.jobs.set(jobId, job);
    return job;
  }

  get(jobId: string): GenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  update(jobId: string, patch: Partial<GenerationJob>): GenerationJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) {
      return undefined;
    }
    Object.assign(job, patch);
    return job;
  }

  addFolder(jobId: string, folderPath: string): GenerationJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) {
      return undefined;
    }
    if (!job.folders.includes(folderPath)) {
      job.folders.push(folderPath);
    }
    return job;
  }

  addFile(jobId: string, file: GeneratedFileRecord): GenerationJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) {
      return undefined;
    }
    job.files.push(file);
    job.currentFile = file.path;
    return job;
  }

  toStatusDto(job: GenerationJob) {
    return {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      message: job.message,
      currentFile: job.currentFile,
      filesCreated: job.files,
      foldersCreated: job.folders,
      result: job.status === "completed" ? job.result : undefined,
      error: job.error,
      outputDir: job.outputDir,
    };
  }
}
