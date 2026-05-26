import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class VerifyHumanDto {
  @ApiProperty({ example: "cloudflare_turnstile_token" })
  @IsString()
  @MinLength(1, { message: "Human verification is required" })
  turnstileToken!: string;
}
