import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RefreshSessionDto {
  @ApiProperty({ example: "refresh_token_here" })
  @IsString()
  @MinLength(1, { message: "Refresh token is required" })
  refreshToken!: string;
}
