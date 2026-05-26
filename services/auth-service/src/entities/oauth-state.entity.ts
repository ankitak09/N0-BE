import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AuthProvider } from "./user.entity";

@Entity({ name: "oauth_states" })
export class OAuthStateEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "text" })
  state!: string;

  @Column({ type: "varchar", length: 16 })
  provider!: AuthProvider;

  @Column({ name: "redirect_to", type: "varchar", length: 255, default: "/dashboard" })
  redirectTo!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
