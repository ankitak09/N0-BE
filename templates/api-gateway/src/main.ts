import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureHttpApp } from "./infrastructure/app-bootstrap";
import { registerGatewayAuth } from "./proxy/gateway-auth.middleware";
import { registerProxies } from "./proxy/register-proxies";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const serviceName = config.get<string>("SERVICE_NAME") ?? "n0-api-gateway";
  configureHttpApp(app, { serviceName, serviceSlug: "gateway" });

  await app.init();
  registerGatewayAuth(app);
  registerProxies(app);

  const port = Number(config.get<string>("PORT") ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`${serviceName} (edge) on http://localhost:${port}/api`);
  // eslint-disable-next-line no-console
  console.log(`Proxies auth + project routes to internal services`);
}

void bootstrap();
