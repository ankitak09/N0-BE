import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAisTable0001 implements MigrationInterface {
  name = "CreateAisTable0001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "n0_ais" (
        "id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "owner_id" character varying(128) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_n0_ais" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_n0_ais_owner_created"
      ON "n0_ais" ("owner_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "n0_ais"`);
  }
}
