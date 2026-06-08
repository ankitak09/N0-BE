import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

function sanitizeOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  if (document.info.contact && Object.keys(document.info.contact).length === 0) {
    delete document.info.contact;
  }

  for (const pathItem of Object.values(document.paths ?? {})) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== "object" || !("responses" in operation)) {
        continue;
      }
      for (const response of Object.values(operation.responses ?? {})) {
        if (
          response &&
          typeof response === "object" &&
          "description" in response &&
          !response.description
        ) {
          response.description = "Success";
        }
      }
    }
  }

  return document;
}

export function setupSwagger(app: INestApplication, serviceName: string, serviceSlug: string) {
  const config = app.get(ConfigService);
  const port = config.get<string>("PORT") ?? "4099";

  const swaggerConfig = new DocumentBuilder()
    .setTitle(serviceName)
    .setDescription(`N0 ${serviceSlug} API`)
    .setVersion("1.0")
    .addServer(`http://localhost:${port}`, "Local development")
    .addBearerAuth()
    .build();

  const document = sanitizeOpenApiDocument(SwaggerModule.createDocument(app, swaggerConfig));
  SwaggerModule.setup("api/docs", app, document);

  const docsDir = path.join(process.cwd(), "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(docsDir, "openapi.json"), JSON.stringify(document, null, 2));
  fs.writeFileSync(path.join(docsDir, "openapi.yaml"), yaml.stringify(document));
}
