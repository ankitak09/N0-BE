import { Controller, MessageEvent, Param, Sse } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Observable, merge, of } from "rxjs";
import { map } from "rxjs/operators";
import { Public } from "../../decorators/public.decorator";
import type { GenerationStreamEvent } from "./generation-events";
import { GenerationStreamService } from "./generation-stream.service";
import { WorkspacesService } from "./workspaces.service";

function toMessage(event: GenerationStreamEvent): MessageEvent {
  return { data: event };
}

@ApiTags("workspaces")
@Controller("workspaces")
export class GenerationStreamController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly generationStream: GenerationStreamService,
  ) {}

  @Public()
  @Sse(":workspaceId/projects/:projectId/generation/stream")
  streamGeneration(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ): Observable<MessageEvent> {
    const snapshot = this.workspacesService.getGeneration(workspaceId, projectId);
    const isTerminal = snapshot.status === "completed" || snapshot.status === "failed";
    const initial: GenerationStreamEvent = {
      type: "progress",
      status: snapshot.status,
      progress: snapshot.progress,
      message: snapshot.message,
      currentFile: snapshot.currentFile,
      filesCreated: snapshot.filesCreated ?? [],
      filesCount: snapshot.filesCount ?? 0,
    };

    const replayed = this.generationStream.replay(projectId).map((event) => of(toMessage(event)));
    if (isTerminal) {
      return merge(...replayed, of(toMessage(initial)));
    }

    return merge(...replayed, of(toMessage(initial)), this.generationStream.observe(projectId).pipe(map(toMessage)));
  }
}
