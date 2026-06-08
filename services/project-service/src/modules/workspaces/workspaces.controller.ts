import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../decorators/public.decorator";
import { AuthenticatedRequest } from "../../guards/jwt-auth.guard";
import { CreateProjectDto } from "./dto/create-project.dto";
import { RegenerateProjectDto } from "./dto/regenerate-project.dto";
import { WorkspacesService } from "./workspaces.service";

@ApiTags("workspaces")
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Public()
  @Get("current")
  getCurrentWorkspace() {
    return this.workspacesService.getCurrentWorkspace();
  }

  @Public()
  @Get(":workspaceId/folders/tree")
  getFolderTree(@Param("workspaceId") workspaceId: string) {
    return this.workspacesService.getFolderTree(workspaceId);
  }

  @Public()
  @Get(":workspaceId/folders")
  listFolders(
    @Param("workspaceId") workspaceId: string,
    @Query("parentFolderId") parentFolderId?: string,
  ) {
    const parsed =
      parentFolderId === undefined
        ? undefined
        : parentFolderId === "null"
          ? null
          : parentFolderId;
    return this.workspacesService.listFolders(workspaceId, parsed);
  }

  @Public()
  @Get(":workspaceId/projects/unfoldered")
  listUnfolderedProjects(@Param("workspaceId") workspaceId: string) {
    return this.workspacesService.listUnfolderedProjects(workspaceId);
  }

  @Public()
  @Get(":workspaceId/projects")
  listProjects(
    @Param("workspaceId") workspaceId: string,
    @Query("folderId") folderId?: string,
  ) {
    const parsed = folderId === undefined ? undefined : folderId === "null" ? null : folderId;
    return this.workspacesService.listProjects(workspaceId, parsed);
  }

  @Public()
  @Post(":workspaceId/projects")
  createProject(
    @Param("workspaceId") workspaceId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
  ) {
    const userId = req.userId ?? "user_demo";
    const userName = req.email ?? "Demo User";
    return {
      message: "Project created successfully",
      data: this.workspacesService.createProject(workspaceId, userId, userName, dto),
    };
  }

  @Public()
  @Post(":workspaceId/projects/:projectId/generation")
  regenerateProject(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Body() dto: RegenerateProjectDto,
  ) {
    return {
      message: "Generation started",
      data: this.workspacesService.regenerateProject(workspaceId, projectId, dto),
    };
  }

  @Public()
  @Get(":workspaceId/projects/:projectId/generation")
  getGeneration(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.workspacesService.getGeneration(workspaceId, projectId);
  }

  @Public()
  @Get(":workspaceId/projects/:projectId/screens")
  getProjectScreens(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.workspacesService.getProjectScreens(workspaceId, projectId);
  }

  @Public()
  @Get(":workspaceId/projects/:projectId/files")
  getProjectFiles(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.workspacesService.getProjectFiles(workspaceId, projectId);
  }

  @Public()
  @Get(":workspaceId/projects/:projectId/files/content")
  getProjectFileContent(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Query("path") filePath: string,
  ) {
    return this.workspacesService.getProjectFileContent(workspaceId, projectId, filePath);
  }

  @Public()
  @Get(":workspaceId/projects/:projectId")
  getProject(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.workspacesService.getProject(workspaceId, projectId);
  }
}
