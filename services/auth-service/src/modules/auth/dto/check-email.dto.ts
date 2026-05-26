import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class CheckEmailDto {
  @ApiProperty({ example: "rahul@example.com" })
  @IsEmail({}, { message: "Please enter a valid email address" })
  email!: string;
}
