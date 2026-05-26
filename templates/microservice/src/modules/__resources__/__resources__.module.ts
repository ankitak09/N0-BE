import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { __Resource__Entity } from "../../entities/__resource__.entity";
import { __Resources__Controller } from "./__resources__.controller";
import { __Resources__Service } from "./__resources__.service";

@Module({
  imports: [TypeOrmModule.forFeature([__Resource__Entity])],
  controllers: [__Resources__Controller],
  providers: [__Resources__Service],
  exports: [__Resources__Service],
})
export class __Resources__Module {}
