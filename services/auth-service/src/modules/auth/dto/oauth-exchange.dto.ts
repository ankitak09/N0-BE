import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class OAuthExchangeDto {
  @ApiProperty({ example: "oauth_state_or_code" })
  @IsString()
  @MinLength(1, { message: "OAuth code is required" })
  code!: string;
}
