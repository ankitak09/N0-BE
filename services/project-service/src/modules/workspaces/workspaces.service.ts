import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ErrorCode } from "../../common/errors";
import { AppException } from "../../common/errors/app.exception";
import {
  isTemplateGenerationAllowed,
  resolveEffectiveGenerationMode,
} from "../../common/generation-mode.policy";
import { AiClientService } from "../ai-client/ai-client.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { RegenerateProjectDto } from "./dto/regenerate-project.dto";
import { DEMO_WORKSPACE_ID, InMemoryStore, ProjectRecord } from "./in-memory.store";
import { PreviewRuntimeService } from "./preview-runtime.service";
import { readProjectFileContent } from "./project-files.reader";
import type { GenerationFileRef } from "./generation-events";
import { GenerationStreamService } from "./generation-stream.service";

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);
  private readonly store = new InMemoryStore();
  private readonly previewUrls = new Map<string, string>();

  constructor(
    private readonly config: ConfigService,
    private readonly aiClient: AiClientService,
    private readonly generationStream: GenerationStreamService,
    private readonly previewRuntime: PreviewRuntimeService,
  ) {}

  getCurrentWorkspace() {
    return {
      ...this.store.workspace,
      templateGenerationAllowed: isTemplateGenerationAllowed(this.config),
    };
  }

  getFolderTree(workspaceId: string) {
    this.assertWorkspace(workspaceId);
    const buildTree = (parentId: string | null): Array<Record<string, unknown>> =>
      this.store.folders
        .filter((folder) => folder.parentFolderId === parentId)
        .map((folder) => ({
          ...folder,
          children: buildTree(folder.id),
          projects: this.store.projects
            .filter((project) => project.folderId === folder.id && project.status === "active")
            .map((project) => this.toProjectDto(project)),
        }));

    return buildTree(null);
  }

  listFolders(workspaceId: string, parentFolderId?: string | null) {
    this.assertWorkspace(workspaceId);
    return this.store.folders.filter((folder) => {
      if (folder.workspaceId !== workspaceId) {
        return false;
      }
      if (parentFolderId === undefined) {
        return true;
      }
      if (parentFolderId === null) {
        return folder.parentFolderId === null;
      }
      return folder.parentFolderId === parentFolderId;
    });
  }

  listProjects(workspaceId: string, folderId?: string | null) {
    this.assertWorkspace(workspaceId);
    return this.store.projects
      .filter((project) => {
        if (project.workspaceId !== workspaceId || project.status !== "active") {
          return false;
        }
        if (folderId === undefined) {
          return true;
        }
        return project.folderId === folderId;
      })
      .map((project) => this.toProjectDto(project));
  }

  listUnfolderedProjects(workspaceId: string) {
    return this.listProjects(workspaceId, null);
  }

  createProject(workspaceId: string, userId: string, userName: string, dto: CreateProjectDto) {
    this.assertWorkspace(workspaceId);

    if (dto.generationMode === false && !isTemplateGenerationAllowed(this.config)) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        "Template generation is only available in development and QA environments",
        HttpStatus.BAD_REQUEST,
      );
    }

    const generationMode = resolveEffectiveGenerationMode(dto.generationMode, this.config);
    const project = this.store.createProject({
      workspaceId,
      folderId: dto.folderId ?? null,
      name: dto.name,
      prompt: dto.prompt,
      visibility: dto.visibility,
      creatorId: userId,
      creatorName: userName,
      generationMode,
    });

    if (dto.prompt?.trim()) {
      const prompt = dto.prompt.trim();
      setImmediate(() => {
        void this.runGeneration(project.id, prompt, workspaceId, generationMode);
      });
    }

    return this.toProjectDto(project);
  }

  getProject(workspaceId: string, projectId: string) {
    const project = this.findProject(workspaceId, projectId);
    return this.toProjectDto(project);
  }

  regenerateProject(workspaceId: string, projectId: string, dto: RegenerateProjectDto) {
    this.assertWorkspace(workspaceId);
    const project = this.findProject(workspaceId, projectId);
    const prompt = dto.prompt.trim();

    if (!prompt) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        "Prompt is required",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (project.generationStatus === "pending" || project.generationStatus === "running") {
      throw new AppException(
        ErrorCode.CONFLICT,
        "Generation is already in progress for this project",
        HttpStatus.CONFLICT,
      );
    }

    const requestedMode = dto.generationMode ?? project.generationMode ?? true;
    if (requestedMode === false && !isTemplateGenerationAllowed(this.config)) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        "Template generation is only available in development and QA environments",
        HttpStatus.BAD_REQUEST,
      );
    }

    const generationMode = resolveEffectiveGenerationMode(requestedMode, this.config);

    this.previewUrls.delete(projectId);
    this.store.replaceProjectFiles(projectId, []);
    this.store.clearGenerationSnapshot(projectId);
    this.store.setGeneration(projectId, {
      generationStatus: "pending",
      generationProgress: 0,
      generationError: undefined,
      prompt,
      description: prompt,
      generationMode,
    });

    setImmediate(() => {
      void this.runGeneration(projectId, prompt, workspaceId, generationMode);
    });

    const updated = this.findProject(workspaceId, projectId);
    return this.toProjectDto(updated);
  }

  getGeneration(workspaceId: string, projectId: string) {
    const project = this.findProject(workspaceId, projectId);
    const snapshot = this.store.getGenerationSnapshot(projectId);
    const files = this.store.listProjectFiles(projectId);
    const livePreviewUrl = this.previewRuntime.getLivePreviewUrl(projectId);
    if (project.generationStatus === "completed" && !livePreviewUrl) {
      void this.previewRuntime
        .ensureProjectPreview(projectId)
        .then((url) => {
          if (url) {
            this.previewUrls.set(projectId, url);
          }
        })
        .catch((error) => {
          this.logger.warn(
            `Background preview boot failed for ${projectId}: ${
              error instanceof Error ? error.message : "unknown"
            }`,
          );
        });
    }
    if (livePreviewUrl) {
      this.previewUrls.set(projectId, livePreviewUrl);
    }

    return {
      status: project.generationStatus,
      progress: project.generationProgress,
      message: snapshot?.message ?? this.generationMessage(project.generationStatus),
      error: project.generationError,
      currentFile: snapshot?.currentFile,
      filesCreated: snapshot?.filesCreated ?? files.map((file) => ({
        path: file.path,
        size: file.size,
        createdAt: file.createdAt,
      })),
      filesCount: files.length,
      previewUrl: livePreviewUrl ?? this.previewUrls.get(projectId),
    };
  }

  getProjectFiles(workspaceId: string, projectId: string) {
    this.findProject(workspaceId, projectId);
    return this.store.listProjectFiles(projectId).map((file) => ({
      id: file.id,
      projectId: file.projectId,
      path: file.path,
      size: file.size,
      createdAt: file.createdAt,
    }));
  }

  async getProjectFileContent(workspaceId: string, projectId: string, filePath: string) {
    this.findProject(workspaceId, projectId);
    const files = this.store.listProjectFiles(projectId);
    const known = files.find((file) => file.path === filePath);
    if (!known) {
      throw new AppException(ErrorCode.NOT_FOUND, "File not found", HttpStatus.NOT_FOUND);
    }

    try {
      const content = await readProjectFileContent(projectId, filePath);
      return {
        path: filePath,
        content,
        size: Buffer.byteLength(content, "utf8"),
        readOnly: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read file";
      throw new AppException(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
    }
  }

  getProjectScreens(workspaceId: string, projectId: string) {
    this.findProject(workspaceId, projectId);
    return this.store.screens
      .filter((screen) => screen.projectId === projectId)
      .sort((a, b) => a.order - b.order)
      .map((screen) => ({
        id: screen.id,
        projectId: screen.projectId,
        name: screen.name,
        routePath: screen.routePath,
        order: screen.order,
        thumbnailUrl: undefined,
        createdAt: screen.createdAt,
        updatedAt: screen.updatedAt,
      }));
  }

  private foldersFromFilePath(filePath: string): string[] {
    const parts = filePath.split("/").filter(Boolean);
    const folders: string[] = [];
    for (let index = 1; index < parts.length; index += 1) {
      folders.push(parts.slice(0, index).join("/"));
    }
    return folders;
  }

  private async runGeneration(
    projectId: string,
    prompt: string,
    workspaceId: string,
    generationMode: boolean,
  ) {
    const jobId = `gen_${projectId}`;
    let lastFileCount = 0;
    const knownFolders = new Set<string>();

    try {
      this.generationStream.emit(projectId, {
        type: "session.start",
        jobId,
        projectId,
        prompt,
      });

      this.store.setGeneration(projectId, {
        generationStatus: "running",
        generationProgress: 5,
      });
      this.store.setGenerationSnapshot(projectId, {
        message: generationMode ? "Starting AI generation..." : "Loading ecommerce template...",
        filesCreated: [],
      });
      this.publishProgress(workspaceId, projectId);

      const folder = this.store.folders.find((item) => item.workspaceId === workspaceId);
      const response = await this.aiClient.generateWebApp(
        {
          jobId,
          prompt,
          context: {
            workspaceId,
            workspaceName: this.store.workspace.name,
            folderName: folder?.name,
            projectId,
            generationMode,
          },
        },
        (update) => {
          this.store.setGeneration(projectId, {
            generationStatus: "running",
            generationProgress: update.progress,
          });
          this.store.setGenerationSnapshot(projectId, {
            message: update.message,
            currentFile: update.currentFile,
            filesCreated: update.filesCreated,
          });
          this.store.replaceProjectFiles(projectId, update.filesCreated);

          for (const folderPath of update.foldersCreated) {
            if (!knownFolders.has(folderPath)) {
              knownFolders.add(folderPath);
              this.generationStream.emit(projectId, { type: "folder.created", path: folderPath });
            }
          }

          if (update.filesCreated.length > lastFileCount) {
            const newFiles = update.filesCreated.slice(lastFileCount);
            for (const file of newFiles) {
              for (const folderPath of this.foldersFromFilePath(file.path)) {
                if (!knownFolders.has(folderPath)) {
                  knownFolders.add(folderPath);
                  this.generationStream.emit(projectId, { type: "folder.created", path: folderPath });
                }
              }
              this.generationStream.emit(projectId, {
                type: "file.created",
                file,
                filesCount: update.filesCreated.length,
              });
            }
            lastFileCount = update.filesCreated.length;
          }

          this.publishProgress(workspaceId, projectId);
        },
      );

      if (!response.result) {
        throw new Error("AI generation returned no result");
      }

      this.store.replaceScreens(
        projectId,
        response.result.screens.map((screen) => ({
          name: screen.name,
          routePath: screen.routePath,
          order: screen.order,
          description: screen.description,
        })),
      );

      this.store.replaceProjectFiles(projectId, response.filesCreated ?? []);
      this.store.setGeneration(projectId, {
        generationStatus: "completed",
        generationProgress: 100,
        name: response.result.suggestedProjectName,
        description: prompt,
      });
      this.store.setGenerationSnapshot(projectId, {
        message: "Generation complete",
        filesCreated: response.filesCreated ?? [],
      });
      let previewUrl: string | undefined;
      try {
        previewUrl = await this.previewRuntime.ensureProjectPreview(projectId, (message) => {
          this.store.setGenerationSnapshot(projectId, {
            message,
            filesCreated: response.filesCreated ?? [],
          });
          this.publishProgress(workspaceId, projectId);
        });
      } catch (previewError) {
        const previewMessage =
          previewError instanceof Error ? previewError.message : "Preview setup failed";
        this.logger.warn(`Preview setup failed for ${projectId}: ${previewMessage}`);
      }
      if (previewUrl) {
        this.previewUrls.set(projectId, previewUrl);
      }

      const files = (response.filesCreated ?? []) as GenerationFileRef[];
      this.generationStream.emit(projectId, {
        type: "session.end",
        status: "completed",
        progress: 100,
        message: "Generation complete",
        filesCount: files.length,
        templateId: response.result.templateId ?? "llm-generated",
        previewUrl,
        suggestedProjectName: response.result.suggestedProjectName,
        screens: response.result.screens,
      });
      this.store.clearGenerationSnapshot(projectId);
      this.generationStream.complete(projectId);

      this.logger.log(`Generation completed for project ${projectId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      const files = this.store.listProjectFiles(projectId).map((file) => ({
        path: file.path,
        size: file.size,
        createdAt: file.createdAt,
      }));

      this.store.setGeneration(projectId, {
        generationStatus: "failed",
        generationProgress: 0,
        generationError: message,
      });
      this.store.setGenerationSnapshot(projectId, {
        message: "Generation failed",
        filesCreated: files,
      });

      this.generationStream.emit(projectId, {
        type: "session.end",
        status: "failed",
        progress: 0,
        message: "Generation failed",
        error: message,
        filesCount: files.length,
        screens: [],
      });
      this.generationStream.complete(projectId);
      this.logger.error(`Generation failed for project ${projectId}: ${message}`);
    }
  }

  private publishProgress(workspaceId: string, projectId: string) {
    const snapshot = this.getGeneration(workspaceId, projectId);
    this.generationStream.emit(projectId, {
      type: "progress",
      status: snapshot.status,
      progress: snapshot.progress,
      message: snapshot.message,
      currentFile: snapshot.currentFile,
      filesCreated: snapshot.filesCreated ?? [],
      filesCount: snapshot.filesCount ?? 0,
      previewUrl: snapshot.previewUrl,
    });
  }

  private generationMessage(status: ProjectRecord["generationStatus"]) {
    switch (status) {
      case "pending":
        return "Queued for generation...";
      case "running":
        return "AI is generating your web app...";
      case "completed":
        return "Generation complete";
      case "failed":
        return "Generation failed";
      default:
        return "";
    }
  }

  private findProject(workspaceId: string, projectId: string) {
    const project = this.store.projects.find(
      (item) => item.id === projectId && item.workspaceId === workspaceId,
    );
    if (!project) {
      throw new AppException(ErrorCode.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }
    return project;
  }

  private assertWorkspace(workspaceId: string) {
    if (workspaceId !== DEMO_WORKSPACE_ID) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: "Workspace not found",
      });
    }
  }

  private toProjectDto(project: ProjectRecord) {
    return {
      id: project.id,
      workspaceId: project.workspaceId,
      folderId: project.folderId,
      name: project.name,
      description: project.description,
      status: project.status,
      visibility: project.visibility,
      creatorId: project.creatorId,
      creatorName: project.creatorName,
      theme: project.theme,
      thumbnailUrl: undefined,
      generationStatus: project.generationStatus,
      generationError: project.generationError,
      generationMode: project.generationMode ?? false,
      lastEditedAt: project.lastEditedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
