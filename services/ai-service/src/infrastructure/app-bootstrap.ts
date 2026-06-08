import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { json, urlencoded } from "express";
import { applyPlatformCors, applyPlatformSecurity } from "./platform-http";
import { HttpExceptionFilter } from "../filters/http-exception.filter";
import { ApiResponseInterceptor } from "../interceptors/api-response.interceptor";
import { requestIdMiddleware } from "../middleware/request-id.middleware";
import { setupSwagger } from "./swagger";

export interface BootstrapOptions {
  serviceName: string;
  serviceSlug: string;
}

export function configureHttpApp(app: INestApplication, options: BootstrapOptions) {
  const config = app.get(ConfigService);

  applyPlatformSecurity(app);
  app.use(requestIdMiddleware);

  const bodyLimit = config.get<string>("BODY_LIMIT") ?? "1mb";
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  if (config.get("TRUST_PROXY") === "true") {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }

  applyPlatformCors(app, config);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableShutdownHooks();

  const enableSwagger =
    config.get("NODE_ENV") !== "production" || config.get("ENABLE_SWAGGER") === "true";
  if (enableSwagger) {
    setupSwagger(app, options.serviceName, options.serviceSlug);
  }
}
