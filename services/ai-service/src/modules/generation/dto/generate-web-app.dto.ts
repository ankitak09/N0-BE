import { IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class GenerateWebAppDto {
  @IsString()
  @MinLength(1)
  jobId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  prompt!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
