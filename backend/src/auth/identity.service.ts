import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ProfileEntity, UserEntity } from '../entities/shared.entities';

export interface RequestUser {
  id: number;
  authUserId: string;
  email: string;
  fullName: string;
  displayName: string | null;
  profileId: number;
  profileName: string;
  active: boolean;
  blocked: boolean;
  permissions: string[]; // apenas códigos opp.*
}

const CACHE_TTL_MS = 60_000;

/**
 * Resolve identidade e permissões na base corporativa compartilhada.
 * Cache curto por usuário: bloqueio/da troca de perfil vale em <= 60s.
 */
@Injectable()
export class IdentityService {
  private cache = new Map<string, { at: number; user: RequestUser | null }>();

  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(ProfileEntity) private readonly profiles: Repository<ProfileEntity>,
  ) {}

  async resolveByAuthUserId(authUserId: string): Promise<RequestUser | null> {
    const cached = this.cache.get(authUserId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.user;

    const row = await this.users.manager.query<
      Array<{
        id: string;
        email: string;
        full_name: string;
        display_name: string | null;
        profile_id: string;
        profile_name: string;
        active: boolean;
        blocked: boolean;
        permissions: string[] | null;
      }>
    >(
      `select u.id, u.email, u.full_name, u.display_name, u.profile_id, u.active, u.blocked,
              p.name as profile_name,
              array_remove(array_agg(pe.code) filter (where pe.code like 'opp.%'), null) as permissions
         from users u
         join profiles p on p.id = u.profile_id
         left join profile_permissions pp on pp.profile_id = u.profile_id
         left join permissions pe on pe.id = pp.permission_id and pe.active
        where u.auth_user_id = $1
        group by u.id, u.email, u.full_name, u.display_name, u.profile_id, u.active, u.blocked, p.name`,
      [authUserId],
    );

    const user: RequestUser | null = row[0]
      ? {
          id: Number(row[0].id),
          authUserId,
          email: row[0].email,
          fullName: row[0].full_name,
          displayName: row[0].display_name,
          profileId: Number(row[0].profile_id),
          profileName: row[0].profile_name,
          active: row[0].active,
          blocked: row[0].blocked,
          permissions: row[0].permissions ?? [],
        }
      : null;

    this.cache.set(authUserId, { at: Date.now(), user });
    return user;
  }

  async searchUsers(search: string): Promise<Array<Pick<UserEntity, 'id' | 'fullName' | 'email'>>> {
    return this.users.find({
      select: { id: true, fullName: true, email: true },
      where: [
        { fullName: ILike(`%${search}%`), active: true, blocked: false },
        { email: ILike(`%${search}%`), active: true, blocked: false },
      ],
      take: 20,
      order: { fullName: 'ASC' },
    });
  }
}
