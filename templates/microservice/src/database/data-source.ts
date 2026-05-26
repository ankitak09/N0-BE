import { config } from "dotenv";
import { resolve } from "path";
import "reflect-metadata";
import { DataSource } from "typeorm";

config({ path: resolve(__dirname, "../../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and run migrations from the service directory.",
  );
}

export default new DataSource({
  type: "postgres",
  url: databaseUrl,
  entities: ["src/entities/**/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === "true",
});
