export type GenerationStatus = "pending" | "running" | "completed" | "failed";

export type WorkspaceRecord = {
  id: string;
  name: string;
  plan: "free" | "pro" | "business";
  memberCount: number;
  currentUserRole: "owner" | "admin" | "member";
};

export type FolderRecord = {
  id: string;
  workspaceId: string;
  parentFolderId: string | null;
  name: string;
  visibility: "workspace" | "personal";
  projectCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectRecord = {
  id: string;
  workspaceId: string;
  folderId: string | null;
  name: string;
  description?: string;
  prompt?: string;
  status: "active" | "archived" | "deleted";
  visibility: "workspace" | "personal" | "private";
  creatorId: string;
  creatorName: string;
  theme: "blank" | "shop" | "minimal" | "store";
  generationStatus: GenerationStatus;
  generationError?: string;
  generationProgress: number;
  /** true = AI path, false = ecommerce template */
  generationMode?: boolean;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ScreenRecord = {
  id: string;
  projectId: string;
  name: string;
  routePath: string;
  order: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFileRecord = {
  id: string;
  projectId: string;
  path: string;
  size: number;
  createdAt: string;
};

const now = "2026-05-21T09:00:00.000Z";

export const DEMO_WORKSPACE_ID = "ws_rahul_n0_clone";

export class InMemoryStore {
  workspace: WorkspaceRecord = {
    id: DEMO_WORKSPACE_ID,
    name: "Rahul's N0 Clone",
    plan: "free",
    memberCount: 1,
    currentUserRole: "owner",
  };

  folders: FolderRecord[] = [
    {
      id: "setup",
      workspaceId: DEMO_WORKSPACE_ID,
      parentFolderId: null,
      name: "setup",
      visibility: "workspace",
      projectCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "demo",
      workspaceId: DEMO_WORKSPACE_ID,
      parentFolderId: "setup",
      name: "demo",
      visibility: "workspace",
      projectCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "testing",
      workspaceId: DEMO_WORKSPACE_ID,
      parentFolderId: null,
      name: "testing",
      visibility: "workspace",
      projectCount: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "new-folder",
      workspaceId: DEMO_WORKSPACE_ID,
      parentFolderId: null,
      name: "New folder",
      visibility: "workspace",
      projectCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  projects: ProjectRecord[] = [
    {
      id: "proj_demo_storefront",
      workspaceId: DEMO_WORKSPACE_ID,
      folderId: "demo",
      name: "Demo Storefront",
      description: "Generated demo storefront inside setup/demo.",
      status: "active",
      visibility: "private",
      creatorId: "user_demo",
      creatorName: "Demo User",
      theme: "blank",
      generationStatus: "completed",
      generationProgress: 100,
      lastEditedAt: "2026-05-21T08:58:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "proj_digital_storefront",
      workspaceId: DEMO_WORKSPACE_ID,
      folderId: "testing",
      name: "Your Digital Storefront",
      description: "Generated storefront project.",
      status: "active",
      visibility: "private",
      creatorId: "user_demo",
      creatorName: "Demo User",
      theme: "blank",
      generationStatus: "completed",
      generationProgress: 100,
      lastEditedAt: "2026-05-21T08:55:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
  ];

  projectFiles: ProjectFileRecord[] = [];

  generationSnapshots = new Map<
    string,
    {
      currentFile?: string;
      message: string;
      filesCreated: Array<{ path: string; size: number; createdAt: string }>;
    }
  >();

  screens: ScreenRecord[] = [
    {
      id: "screen_demo_home",
      projectId: "proj_demo_storefront",
      name: "Home",
      routePath: "/",
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "screen_digital_home",
      projectId: "proj_digital_storefront",
      name: "Home",
      routePath: "/",
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  private id(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  recalcFolderCounts() {
    for (const folder of this.folders) {
      folder.projectCount = this.projects.filter(
        (project) => project.folderId === folder.id && project.status === "active",
      ).length;
    }
  }

  createProject(input: {
    workspaceId: string;
    folderId: string | null;
    name: string;
    prompt?: string;
    visibility: ProjectRecord["visibility"];
    creatorId: string;
    creatorName: string;
    generationMode?: boolean;
  }): ProjectRecord {
    const timestamp = new Date().toISOString();
    const project: ProjectRecord = {
      id: this.id("proj"),
      workspaceId: input.workspaceId,
      folderId: input.folderId,
      name: input.name,
      description: input.prompt,
      prompt: input.prompt,
      status: "active",
      visibility: input.visibility,
      creatorId: input.creatorId,
      creatorName: input.creatorName,
      theme: "blank",
      generationStatus: input.prompt ? "pending" : "completed",
      generationProgress: input.prompt ? 0 : 100,
      generationMode: input.generationMode ?? false,
      lastEditedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.projects.push(project);
    this.recalcFolderCounts();
    return project;
  }

  setGeneration(
    projectId: string,
    patch: Partial<
      Pick<
        ProjectRecord,
        | "generationStatus"
        | "generationError"
        | "generationProgress"
        | "name"
        | "description"
        | "prompt"
        | "generationMode"
      >
    >,
  ) {
    const project = this.projects.find((item) => item.id === projectId);
    if (!project) {
      return null;
    }
    Object.assign(project, patch, { updatedAt: new Date().toISOString() });
    return project;
  }

  replaceScreens(projectId: string, screens: Omit<ScreenRecord, "id" | "projectId" | "createdAt" | "updatedAt">[]) {
    const timestamp = new Date().toISOString();
    this.screens = this.screens.filter((screen) => screen.projectId !== projectId);
    for (const screen of screens) {
      this.screens.push({
        id: this.id("screen"),
        projectId,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...screen,
      });
    }
  }

  setGenerationSnapshot(
    projectId: string,
    snapshot: {
      currentFile?: string;
      message: string;
      filesCreated: Array<{ path: string; size: number; createdAt: string }>;
    },
  ) {
    this.generationSnapshots.set(projectId, snapshot);
  }

  clearGenerationSnapshot(projectId: string) {
    this.generationSnapshots.delete(projectId);
  }

  getGenerationSnapshot(projectId: string) {
    return this.generationSnapshots.get(projectId);
  }

  replaceProjectFiles(
    projectId: string,
    files: Array<{ path: string; size: number; createdAt: string }>,
  ) {
    this.projectFiles = this.projectFiles.filter((file) => file.projectId !== projectId);
    for (const file of files) {
      this.projectFiles.push({
        id: this.id("file"),
        projectId,
        path: file.path,
        size: file.size,
        createdAt: file.createdAt,
      });
    }
  }

  listProjectFiles(projectId: string) {
    return this.projectFiles
      .filter((file) => file.projectId === projectId)
      .sort((a, b) => a.path.localeCompare(b.path));
  }
}
