import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest } from "../../guards/jwt-auth.guard";
import { AisService } from "./ais.service";
import { CreateAiDto } from "./dto/create-ai.dto";
import { ListAisQueryDto } from "./dto/list-ais-query.dto";
import { UpdateAiDto } from "./dto/update-ai.dto";

@ApiTags("ais")
@ApiBearerAuth()
@Controller("ais")
export class AisController {
  constructor(private readonly aisService: AisService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAiDto) {
    return this.aisService.create(req.userId, dto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query() query: ListAisQueryDto) {
    return this.aisService.findAll(req.userId, query);
  }

  @Get(":id")
  findOne(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.aisService.findOne(req.userId, id);
  }

  @Patch(":id")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateAiDto,
  ) {
    return this.aisService.update(req.userId, id, dto);
  }

  @Delete(":id")
  remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.aisService.remove(req.userId, id);
  }
}
