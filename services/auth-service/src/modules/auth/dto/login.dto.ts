import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "rahul@example.com" })
  @IsEmail({}, { message: "Please enter a valid email address" })
  email!: string;

  @ApiProperty({ example: "Password123" })
  @IsString()
  @MinLength(1, { message: "Password is required" })
  password!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
