import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

export type AuthenticatedRequest = Request & {
  userId: string;
  email?: string;
  workspaceId?: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException({
        message: "Unauthenticated",
      });
    }

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email?: string;
        workspaceId?: string;
      }>(header.slice(7), {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
      request.userId = payload.sub;
      request.email = payload.email;
      request.workspaceId = payload.workspaceId;
      return true;
    } catch {
      throw new UnauthorizedException({
        message: "Unauthenticated",
      });
    }
  }
}
