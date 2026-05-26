import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailVerificationTokenEntity } from "../../entities/email-verification-token.entity";
import { OAuthStateEntity } from "../../entities/oauth-state.entity";
import { PasswordResetTokenEntity } from "../../entities/password-reset-token.entity";
import { RefreshTokenEntity } from "../../entities/refresh-token.entity";
import { UserEntity } from "../../entities/user.entity";
import { AuthRoutesController } from "./auth.controller";
import { AuthRoutesService } from "./auth.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenEntity,
      EmailVerificationTokenEntity,
      PasswordResetTokenEntity,
      OAuthStateEntity,
    ]),
  ],
  controllers: [AuthRoutesController],
  providers: [AuthRoutesService],
})
export class AuthRoutesModule {}
