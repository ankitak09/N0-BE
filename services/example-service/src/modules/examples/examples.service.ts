import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppException, ErrorCode } from "../../common/errors";
import { isResourceId } from "../../common/resource-id";
import { ExampleEntity } from "../../entities/example.entity";
import { CreateExampleDto } from "./dto/create-example.dto";
import { ListExamplesQueryDto } from "./dto/list-examples-query.dto";
import { UpdateExampleDto } from "./dto/update-example.dto";

@Injectable()
export class ExamplesService {
  constructor(
    @InjectRepository(ExampleEntity)
    private readonly repository: Repository<ExampleEntity>,
  ) {}

  async create(ownerId: string, dto: CreateExampleDto) {
    const entity = this.repository.create({
      name: dto.name,
      description: dto.description ?? null,
      ownerId,
    });
    return this.repository.save(entity);
  }

  async findAll(ownerId: string, query: ListExamplesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "DESC";

    const [items, total] = await this.repository.findAndCount({
      where: { ownerId },
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(ownerId: string, id: string) {
    this.assertValidId(id);
    const item = await this.repository.findOne({ where: { id, ownerId } });
    if (!item) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        "Example not found",
        HttpStatus.NOT_FOUND,
      );
    }
    return item;
  }

  async update(ownerId: string, id: string, dto: UpdateExampleDto) {
    const item = await this.findOne(ownerId, id);
    if (dto.name !== undefined) {
      item.name = dto.name;
    }
    if (dto.description !== undefined) {
      item.description = dto.description ?? null;
    }
    return this.repository.save(item);
  }

  async remove(ownerId: string, id: string) {
    const item = await this.findOne(ownerId, id);
    await this.repository.remove(item);
    return { id };
  }

  private assertValidId(id: string) {
    if (!isResourceId(id)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        "Invalid resource id",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
