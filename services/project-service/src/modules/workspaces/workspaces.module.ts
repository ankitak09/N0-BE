import { Module } from "@nestjs/common";
import { AiClientModule } from "../ai-client/ai-client.module";
import { GenerationStreamController } from "./generation-stream.controller";
import { GenerationStreamService } from "./generation-stream.service";
import { PreviewRuntimeService } from "./preview-runtime.service";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Module({
  imports: [AiClientModule],
  controllers: [WorkspacesController, GenerationStreamController],
  providers: [WorkspacesService, GenerationStreamService, PreviewRuntimeService],
  exports: [WorkspacesService, GenerationStreamService, PreviewRuntimeService],
})
export class WorkspacesModule {}
