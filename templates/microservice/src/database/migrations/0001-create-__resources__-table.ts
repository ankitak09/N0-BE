import { MigrationInterface, QueryRunner } from "typeorm";

export class Create__Resources__Table0001 implements MigrationInterface {
  name = "Create__Resources__Table0001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "n0___resources__" (
        "id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "owner_id" character varying(128) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_n0___resources__" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_n0___resources___owner_created"
      ON "n0___resources__" ("owner_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "n0___resources__"`);
  }
}
