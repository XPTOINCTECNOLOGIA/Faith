import { Column, Entity, PrimaryColumn } from 'typeorm';
import { bigint } from './bigint.transformer';

/**
 * Base corporativa compartilhada (Tetelestai e demais micro-apps).
 * O portal só LÊ estas tabelas — a administração continua na Governança.
 */

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigint })
  id: number;

  @Column({ name: 'auth_user_id', type: 'uuid', nullable: true })
  authUserId: string | null;

  @Column()
  email: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'display_name', type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ name: 'profile_id', type: 'bigint', transformer: bigint })
  profileId: number;

  @Column()
  active: boolean;

  @Column()
  blocked: boolean;
}

@Entity({ name: 'profiles' })
export class ProfileEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigint })
  id: number;

  @Column()
  name: string;

  @Column()
  level: number;

  @Column()
  active: boolean;
}

@Entity({ name: 'permissions' })
export class PermissionEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigint })
  id: number;

  @Column()
  code: string;

  @Column()
  module: string;

  @Column()
  active: boolean;
}

@Entity({ name: 'profile_permissions' })
export class ProfilePermissionEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigint })
  id: number;

  @Column({ name: 'profile_id', type: 'bigint', transformer: bigint })
  profileId: number;

  @Column({ name: 'permission_id', type: 'bigint', transformer: bigint })
  permissionId: number;
}
