import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppException, ErrorCode } from "../../common/errors";
import { isResourceId } from "../../common/resource-id";
import { __Resource__Entity } from "../../entities/__resource__.entity";
import { Create__Resource__Dto } from "./dto/create-__resource__.dto";
import { List__Resources__QueryDto } from "./dto/list-__resources__-query.dto";
import { Update__Resource__Dto } from "./dto/update-__resource__.dto";

@Injectable()
export class __Resources__Service {
  constructor(
    @InjectRepository(__Resource__Entity)
    private readonly repository: Repository<__Resource__Entity>,
  ) {}

  async create(ownerId: string, dto: Create__Resource__Dto) {
    const entity = this.repository.create({
      name: dto.name,
      description: dto.description ?? null,
      ownerId,
    });
    return this.repository.save(entity);
  }

  async findAll(ownerId: string, query: List__Resources__QueryDto) {
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
        "__Resource__ not found",
        HttpStatus.NOT_FOUND,
      );
    }
    return item;
  }

  async update(ownerId: string, id: string, dto: Update__Resource__Dto) {
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
