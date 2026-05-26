import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { KafkaModule } from "./kafka/kafka.module";
import { ExamplesModule } from "./modules/examples/examples.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    AuthModule,
    DatabaseModule,
    KafkaModule,
    HealthModule,
    ExamplesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
