import { Column, CreateDateColumn, Entity, Index, UpdateDateColumn } from "typeorm";
import { UuidEntity } from "./uuid.entity";

@Entity("n0_ais")
@Index(["ownerId", "createdAt"])
export class AiEntity extends UuidEntity {
  @Column({ length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  /** Scoped to JWT `sub` — replace with workspaceId when multi-tenant. */
  @Column({ name: "owner_id", length: 128 })
  ownerId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
