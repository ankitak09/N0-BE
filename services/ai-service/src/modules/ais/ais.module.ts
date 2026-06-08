import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiEntity } from "../../entities/ai.entity";
import { AisController } from "./ais.controller";
import { AisService } from "./ais.service";

@Module({
  imports: [TypeOrmModule.forFeature([AiEntity])],
  controllers: [AisController],
  providers: [AisService],
  exports: [AisService],
})
export class AisModule {}
