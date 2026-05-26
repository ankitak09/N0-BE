import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type AuthProvider = "email" | "google" | "github" | "apple";

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, length: 180 })
  email!: string;

  @Column({ name: "password_hash", type: "text", nullable: true })
  passwordHash!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  name!: string | null;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl!: string | null;

  @Column({ name: "email_verified", default: false })
  emailVerified!: boolean;

  @Column({ type: "varchar", length: 16, default: "email" })
  provider!: AuthProvider;

  @Column({ name: "oauth_subject", type: "varchar", length: 255, nullable: true })
  oauthSubject!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
