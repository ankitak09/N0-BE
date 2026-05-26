import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { IsNull, MoreThan, Repository } from "typeorm";
import { EmailVerificationTokenEntity } from "../../entities/email-verification-token.entity";
import { OAuthStateEntity } from "../../entities/oauth-state.entity";
import { PasswordResetTokenEntity } from "../../entities/password-reset-token.entity";
import { RefreshTokenEntity } from "../../entities/refresh-token.entity";
import { AuthProvider, UserEntity } from "../../entities/user.entity";
import { AuthApiException } from "./auth-api.exception";
import { hashPassword, isStrongPassword, verifyPassword } from "./auth-password.util";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SignupDto } from "./dto/signup.dto";

type SerializedUser = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  provider: AuthProvider;
  createdAt: string;
  updatedAt: string;
};

type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: SerializedUser;
};

@Injectable()
export class AuthRoutesService {
  private readonly logger = new Logger(AuthRoutesService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly emailVerificationTokens: Repository<EmailVerificationTokenEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetTokens: Repository<PasswordResetTokenEntity>,
    @InjectRepository(OAuthStateEntity)
    private readonly oauthStates: Repository<OAuthStateEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async checkEmail(email: string) {
    const normalized = this.normalizeEmail(email);
    const user = await this.users.findOne({ where: { email: normalized } });

    if (!user) {
      return {
        exists: false,
        email: normalized,
        loginMethods: [] as AuthProvider[],
        emailVerified: false,
      };
    }

    return {
      exists: true,
      email: normalized,
      loginMethods: this.resolveLoginMethods(user),
      emailVerified: user.emailVerified,
    };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.users.findOne({ where: { email } });

    if (!user?.passwordHash || !verifyPassword(dto.password, user.passwordHash)) {
      throw new AuthApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    if (!user.emailVerified) {
      throw new AuthApiException(HttpStatus.FORBIDDEN, "Email not verified");
    }

    const session = await this.createSession(user, dto.rememberMe !== false);
    return { message: "Logged in successfully", data: session };
  }

  async signup(dto: SignupDto) {
    await this.verifyTurnstile(dto.turnstileToken);

    if (!isStrongPassword(dto.password)) {
      throw new AuthApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Validation failed", {
        password: "Password must be at least 8 characters and include a number",
      });
    }

    const email = this.normalizeEmail(dto.email);
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new AuthApiException(HttpStatus.CONFLICT, "Email already exists", {
        email: "An account with this email already exists",
      });
    }

    const user = this.users.create({
      email,
      name: dto.name?.trim() || null,
      passwordHash: hashPassword(dto.password),
      emailVerified: false,
      provider: "email",
    });
    await this.users.save(user);

    await this.issueEmailVerificationToken(user.id);

    return {
      message: "Account created successfully",
      data: {
        requiresEmailVerification: true,
        user: this.serializeUser(user),
      },
    };
  }

  async verifyHuman(turnstileToken: string) {
    await this.verifyTurnstile(turnstileToken);
    return { message: "Verification successful" };
  }

  async sendVerificationEmail(email: string) {
    const normalized = this.normalizeEmail(email);
    const user = await this.users.findOne({ where: { email: normalized } });
    if (user && !user.emailVerified) {
      await this.issueEmailVerificationToken(user.id);
    }
    return { message: "Verification email sent" };
  }

  async confirmEmailVerification(token: string) {
    const record = await this.emailVerificationTokens.findOne({
      where: {
        token,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!record) {
      throw new AuthApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid or expired verification token");
    }

    const user = await this.users.findOne({ where: { id: record.userId } });
    if (!user) {
      throw new AuthApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid or expired verification token");
    }

    user.emailVerified = true;
    record.usedAt = new Date();
    await this.users.save(user);
    await this.emailVerificationTokens.save(record);

    const session = await this.createSession(user, true);
    return {
      message: "Email verified successfully",
      data: session,
    };
  }

  async getSession(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new AuthApiException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
    }
    return { user: this.serializeUser(user) };
  }

  async refreshSession(refreshToken: string) {
    const record = await this.refreshTokens.findOne({
      where: {
        token: refreshToken,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!record) {
      throw new AuthApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
    }

    const user = await this.users.findOne({ where: { id: record.userId } });
    if (!user) {
      throw new AuthApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
    }

    record.revokedAt = new Date();
    await this.refreshTokens.save(record);

    const session = await this.createSession(user, true);
    return { data: this.sessionTokensOnly(session) };
  }

  async logout(refreshToken: string) {
    const record = await this.refreshTokens.findOne({ where: { token: refreshToken } });
    if (record && !record.revokedAt) {
      record.revokedAt = new Date();
      await this.refreshTokens.save(record);
    }
    return { message: "Logged out successfully" };
  }

  async forgotPassword(email: string) {
    const normalized = this.normalizeEmail(email);
    const user = await this.users.findOne({ where: { email: normalized } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = this.hoursFromNow(1);
      await this.passwordResetTokens.save(
        this.passwordResetTokens.create({ token, userId: user.id, expiresAt }),
      );
      this.logger.log(`Password reset token for ${normalized}: ${token}`);
    }
    return { message: "If the email exists, reset instructions were sent" };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!isStrongPassword(dto.password)) {
      throw new AuthApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Validation failed", {
        password: "Password must be at least 8 characters and include a number",
      });
    }

    const record = await this.passwordResetTokens.findOne({
      where: {
        token: dto.token,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!record) {
      throw new AuthApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid or expired reset token");
    }

    const user = await this.users.findOne({ where: { id: record.userId } });
    if (!user) {
      throw new AuthApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid or expired reset token");
    }

    user.passwordHash = hashPassword(dto.password);
    record.usedAt = new Date();
    await this.users.save(user);
    await this.passwordResetTokens.save(record);

    return { message: "Password reset successfully" };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user?.passwordHash || !verifyPassword(dto.currentPassword, user.passwordHash)) {
      throw new AuthApiException(HttpStatus.UNAUTHORIZED, "Invalid current password");
    }

    if (!isStrongPassword(dto.newPassword)) {
      throw new AuthApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Validation failed", {
        newPassword: "Password must be at least 8 characters and include a number",
      });
    }

    user.passwordHash = hashPassword(dto.newPassword);
    await this.users.save(user);
    return { message: "Password changed successfully" };
  }

  async oauthStart(provider: AuthProvider, redirectTo = "/dashboard") {
    this.assertOAuthProvider(provider);
    const state = randomBytes(24).toString("hex");
    const expiresAt = this.minutesFromNow(15);
    await this.oauthStates.save(
      this.oauthStates.create({ state, provider, redirectTo, expiresAt }),
    );

    const frontendUrl = this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    const authUrl = `${frontendUrl}/auth/oauth/callback?provider=${provider}&code=${state}`;

    return { data: { authUrl } };
  }

  async oauthCallback(provider: AuthProvider, code: string, state: string) {
    this.assertOAuthProvider(provider);
    if (!code || !state) {
      throw new AuthApiException(HttpStatus.BAD_REQUEST, "OAuth code and state are required");
    }

    const record = await this.oauthStates.findOne({
      where: {
        state,
        provider,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!record || code !== state) {
      throw new AuthApiException(HttpStatus.UNAUTHORIZED, "Invalid OAuth state");
    }

    record.usedAt = new Date();
    await this.oauthStates.save(record);

    const email = `${provider}.${state.slice(0, 8)}@oauth.local`;
    let user = await this.users.findOne({ where: { email } });
    if (!user) {
      user = this.users.create({
        email,
        name: `${provider} user`,
        emailVerified: true,
        provider,
        oauthSubject: state,
      });
      await this.users.save(user);
    }

    const session = await this.createSession(user, true);
    const frontendUrl = this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    const redirect = `${frontendUrl}${record.redirectTo.startsWith("/") ? record.redirectTo : `/${record.redirectTo}`}`;

    return { redirect, session };
  }

  async oauthExchange(code: string) {
    const record = await this.oauthStates.findOne({
      where: {
        state: code,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!record) {
      throw new AuthApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired OAuth code");
    }

    const result = await this.oauthCallback(record.provider, code, code);
    return { data: result.session };
  }

  private async createSession(user: UserEntity, rememberMe: boolean): Promise<SessionPayload> {
    const accessExpiresIn = this.config.get<string>("JWT_ACCESS_EXPIRES") ?? "15m";
    const refreshDays = rememberMe
      ? Number(this.config.get<string>("JWT_REFRESH_EXPIRES_DAYS") ?? 30)
      : 7;

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, type: "access" },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: Math.floor(this.parseDurationMs(accessExpiresIn) / 1000),
      },
    );

    const refreshToken = randomBytes(48).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.refreshTokens.save(
      this.refreshTokens.create({
        token: refreshToken,
        userId: user.id,
        expiresAt,
      }),
    );

    const accessMs = this.parseDurationMs(accessExpiresIn);
    const accessExpiresAt = new Date(Date.now() + accessMs).toISOString();

    return {
      accessToken,
      refreshToken,
      expiresAt: accessExpiresAt,
      user: this.serializeUser(user),
    };
  }

  private sessionTokensOnly(session: SessionPayload) {
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    };
  }

  private async issueEmailVerificationToken(userId: string) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = this.hoursFromNow(24);
    await this.emailVerificationTokens.save(
      this.emailVerificationTokens.create({ token, userId, expiresAt }),
    );
    const user = await this.users.findOne({ where: { id: userId } });
    this.logger.log(`Email verification token for ${user?.email ?? userId}: ${token}`);
  }

  private async verifyTurnstile(turnstileToken: string) {
    const secret = this.config.get<string>("TURNSTILE_SECRET_KEY");
    if (!secret) {
      if (this.config.get("NODE_ENV") === "production") {
        throw new AuthApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Human verification is not configured");
      }
      return;
    }

    const params = new URLSearchParams({
      secret,
      response: turnstileToken,
    });

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const result = (await response.json()) as { success?: boolean };
    if (!result.success) {
      throw new AuthApiException(HttpStatus.BAD_REQUEST, "Human verification failed");
    }
  }

  private resolveLoginMethods(user: UserEntity): AuthProvider[] {
    const methods = new Set<AuthProvider>();
    if (user.passwordHash) {
      methods.add("email");
    }
    if (user.provider !== "email") {
      methods.add(user.provider);
    }
    return [...methods];
  }

  private serializeUser(user: UserEntity): SerializedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      provider: user.provider,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private assertOAuthProvider(provider: string): asserts provider is AuthProvider {
    if (!["google", "github", "apple"].includes(provider)) {
      throw new AuthApiException(HttpStatus.BAD_REQUEST, "Unsupported OAuth provider");
    }
  }

  private hoursFromNow(hours: number): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private minutesFromNow(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) {
      return 15 * 60 * 1000;
    }
    const amount = Number(match[1]);
    switch (match[2]) {
      case "s":
        return amount * 1000;
      case "m":
        return amount * 60 * 1000;
      case "h":
        return amount * 60 * 60 * 1000;
      case "d":
        return amount * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}
