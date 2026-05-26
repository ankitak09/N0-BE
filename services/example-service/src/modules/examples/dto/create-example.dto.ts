import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateExampleDto {
  @ApiProperty({ example: "My Example" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
