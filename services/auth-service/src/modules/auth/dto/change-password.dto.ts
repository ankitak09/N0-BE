import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "OldPassword123" })
  @IsString()
  @MinLength(1, { message: "Current password is required" })
  currentPassword!: string;

  @ApiProperty({ example: "NewPassword123", minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: "Password must be at least 8 characters and include a number",
  })
  newPassword!: string;
}
