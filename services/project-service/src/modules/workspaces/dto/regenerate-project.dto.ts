import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegenerateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  prompt!: string;

  /** true = LLM/AI generation, false = ecommerce template (dev/qa only). */
  @IsOptional()
  @IsBoolean()
  generationMode?: boolean;
}
