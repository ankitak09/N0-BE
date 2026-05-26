import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ example: "password_reset_token" })
  @IsString()
  @MinLength(1, { message: "Reset token is required" })
  token!: string;

  @ApiProperty({ example: "NewPassword123", minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: "Password must be at least 8 characters and include a number",
  })
  password!: string;
}
