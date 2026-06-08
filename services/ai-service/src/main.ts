import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureHttpApp } from "./infrastructure/app-bootstrap";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const serviceName = config.get<string>("SERVICE_NAME") ?? "n0-ai-service";
  configureHttpApp(app, { serviceName, serviceSlug: "ai" });

  const port = Number(config.get<string>("PORT") ?? 4003);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`${serviceName} running on http://localhost:${port}/api`);
  // eslint-disable-next-line no-console
  console.log(`Health: http://localhost:${port}/api/health`);
}

void bootstrap();
