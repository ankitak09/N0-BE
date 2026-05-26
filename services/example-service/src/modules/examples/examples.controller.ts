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
import { ExamplesService } from "./examples.service";
import { CreateExampleDto } from "./dto/create-example.dto";
import { ListExamplesQueryDto } from "./dto/list-examples-query.dto";
import { UpdateExampleDto } from "./dto/update-example.dto";

@ApiTags("examples")
@ApiBearerAuth()
@Controller("examples")
export class ExamplesController {
  constructor(private readonly examplesService: ExamplesService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateExampleDto) {
    return this.examplesService.create(req.userId, dto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query() query: ListExamplesQueryDto) {
    return this.examplesService.findAll(req.userId, query);
  }

  @Get(":id")
  findOne(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.examplesService.findOne(req.userId, id);
  }

  @Patch(":id")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateExampleDto,
  ) {
    return this.examplesService.update(req.userId, id, dto);
  }

  @Delete(":id")
  remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.examplesService.remove(req.userId, id);
  }
}
