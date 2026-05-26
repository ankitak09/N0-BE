import "reflect-metadata";
import { DataSource } from "typeorm";

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: ["src/entities/**/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === "true",
});
