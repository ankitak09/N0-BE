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
import { __Resources__Service } from "./__resources__.service";
import { Create__Resource__Dto } from "./dto/create-__resource__.dto";
import { List__Resources__QueryDto } from "./dto/list-__resources__-query.dto";
import { Update__Resource__Dto } from "./dto/update-__resource__.dto";

@ApiTags("__resources__")
@ApiBearerAuth()
@Controller("__resources__")
export class __Resources__Controller {
  constructor(private readonly __resources__Service: __Resources__Service) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: Create__Resource__Dto) {
    return this.__resources__Service.create(req.userId, dto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query() query: List__Resources__QueryDto) {
    return this.__resources__Service.findAll(req.userId, query);
  }

  @Get(":id")
  findOne(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.__resources__Service.findOne(req.userId, id);
  }

  @Patch(":id")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: Update__Resource__Dto,
  ) {
    return this.__resources__Service.update(req.userId, id, dto);
  }

  @Delete(":id")
  remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.__resources__Service.remove(req.userId, id);
  }
}
