import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class SignupDto {
  @ApiProperty({ example: "rahul@example.com" })
  @IsEmail({}, { message: "Please enter a valid email address" })
  email!: string;

  @ApiProperty({ example: "Password123", minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: "Password must be at least 8 characters and include a number",
  })
  password!: string;

  @ApiPropertyOptional({ example: "Rahul Mukati" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: "cloudflare_turnstile_token" })
  @IsString()
  @MinLength(1, { message: "Human verification is required" })
  turnstileToken!: string;
}
