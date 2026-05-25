import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

export function setupSwagger(app: INestApplication, serviceName: string, serviceSlug: string) {
  const config = new DocumentBuilder()
    .setTitle(serviceName)
    .setDescription(`N0 ${serviceSlug} API`)
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const docsDir = path.join(process.cwd(), "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(docsDir, "openapi.json"), JSON.stringify(document, null, 2));
  fs.writeFileSync(path.join(docsDir, "openapi.yaml"), yaml.stringify(document));
}
