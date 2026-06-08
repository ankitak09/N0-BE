import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProjectDto {
  /** Ignored when present — workspace comes from the URL param. */
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsIn(["workspace", "personal", "private"])
  visibility!: "workspace" | "personal" | "private";

  /** true = LLM/AI generation, false = ecommerce template (dev/qa only; forced true in production). */
  @IsOptional()
  @IsBoolean()
  generationMode?: boolean;
}
