import { randomUUID } from "crypto";
import { BeforeInsert, PrimaryColumn } from "typeorm";

/** Use when Postgres has no DEFAULT on uuid primary keys (Prisma-era tables). */
export abstract class UuidEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @BeforeInsert()
  protected assignUuid() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
