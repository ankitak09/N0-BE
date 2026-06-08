import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.getOrThrow<string>("DATABASE_URL"),
        entities: [__dirname + "/../**/*.entity{.ts,.js}"],
        synchronize: false,
        migrationsRun: false,
        logging: config.get("TYPEORM_LOGGING") === "true",
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
