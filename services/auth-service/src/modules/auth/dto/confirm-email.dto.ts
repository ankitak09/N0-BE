import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ConfirmEmailDto {
  @ApiProperty({ example: "email_verification_token" })
  @IsString()
  @MinLength(1, { message: "Verification token is required" })
  token!: string;
}
