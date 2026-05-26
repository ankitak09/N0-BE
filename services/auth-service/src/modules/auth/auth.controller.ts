import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Public } from "../../decorators/public.decorator";
import { AuthenticatedRequest } from "../../guards/jwt-auth.guard";
import { AuthProvider } from "../../entities/user.entity";
import { AuthRoutesService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CheckEmailDto } from "./dto/check-email.dto";
import { ConfirmEmailDto } from "./dto/confirm-email.dto";
import { EmailDto } from "./dto/email.dto";
import { LoginDto } from "./dto/login.dto";
import { OAuthExchangeDto } from "./dto/oauth-exchange.dto";
import { RefreshSessionDto } from "./dto/refresh-session.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SignupDto } from "./dto/signup.dto";
import { VerifyHumanDto } from "./dto/verify-human.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthRoutesController {
  constructor(private readonly authRoutes: AuthRoutesService) {}

  @Public()
  @Post("check-email")
  checkEmail(@Body() dto: CheckEmailDto) {
    return this.authRoutes.checkEmail(dto.email);
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authRoutes.login(dto);
  }

  @Public()
  @Post("signup")
  signup(@Body() dto: SignupDto) {
    return this.authRoutes.signup(dto);
  }

  @Public()
  @Post("verify-human")
  verifyHuman(@Body() dto: VerifyHumanDto) {
    return this.authRoutes.verifyHuman(dto.turnstileToken);
  }

  @Public()
  @Post("email/verification/send")
  sendVerification(@Body() dto: EmailDto) {
    return this.authRoutes.sendVerificationEmail(dto.email);
  }

  @Public()
  @Post("email/verification/confirm")
  confirmVerification(@Body() dto: ConfirmEmailDto) {
    return this.authRoutes.confirmEmailVerification(dto.token);
  }

  @Get("session")
  @ApiBearerAuth()
  getSession(@Req() req: AuthenticatedRequest) {
    return this.authRoutes.getSession(req.userId);
  }

  @Public()
  @Post("session/refresh")
  refreshSession(@Body() dto: RefreshSessionDto) {
    return this.authRoutes.refreshSession(dto.refreshToken);
  }

  @Public()
  @Post("logout")
  logout(@Body() dto: RefreshSessionDto) {
    return this.authRoutes.logout(dto.refreshToken);
  }

  @Public()
  @Post("password/forgot")
  forgotPassword(@Body() dto: EmailDto) {
    return this.authRoutes.forgotPassword(dto.email);
  }

  @Public()
  @Post("password/reset")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authRoutes.resetPassword(dto);
  }

  @Patch("password/change")
  @ApiBearerAuth()
  changePassword(@Req() req: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    return this.authRoutes.changePassword(req.userId, dto);
  }

  @Public()
  @Get("oauth/:provider/start")
  @ApiParam({ name: "provider", enum: ["google", "github", "apple"] })
  @ApiQuery({ name: "redirectTo", required: false, example: "/dashboard" })
  oauthStart(
    @Param("provider") provider: AuthProvider,
    @Query("redirectTo") redirectTo?: string,
  ) {
    return this.authRoutes.oauthStart(provider, redirectTo);
  }

  @Public()
  @Get("oauth/:provider/callback")
  @ApiParam({ name: "provider", enum: ["google", "github", "apple"] })
  @ApiQuery({ name: "code", required: true })
  @ApiQuery({ name: "state", required: true })
  async oauthCallback(
    @Param("provider") provider: AuthProvider,
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const result = await this.authRoutes.oauthCallback(provider, code, state);
    return res.redirect(HttpStatus.FOUND, result.redirect);
  }

  @Public()
  @Post("oauth/exchange")
  oauthExchange(@Body() dto: OAuthExchangeDto) {
    return this.authRoutes.oauthExchange(dto.code);
  }
}
