import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureHttpApp } from "./infrastructure/app-bootstrap";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const serviceName = config.get<string>("SERVICE_NAME") ?? "n0-auth-service";
  configureHttpApp(app, { serviceName, serviceSlug: "auth" });

  const port = Number(config.get<string>("PORT") ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`${serviceName} running on http://localhost:${port}/api`);
  // eslint-disable-next-line no-console
  console.log(`Health: http://localhost:${port}/api/health`);
}

void bootstrap();
