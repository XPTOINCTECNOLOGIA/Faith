import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IdentityService, RequestUser } from './identity.service';

interface GoTrueClaims {
  sub: string; // auth_user_id (uuid) na base compartilhada
  aud?: string | string[];
  email?: string;
}

/**
 * SSO: o portal NÃO emite tokens. Valida o JWT da sessão corporativa
 * (Supabase Auth/GoTrue — mesma sessão do Tetelestai) e resolve a identidade
 * na base compartilhada `public.users`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly identity: IdentityService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('SUPABASE_JWT_SECRET'),
      audience: 'authenticated',
    });
  }

  async validate(claims: GoTrueClaims): Promise<RequestUser> {
    const user = await this.identity.resolveByAuthUserId(claims.sub);
    if (!user) {
      throw new ForbiddenException(
        'Acesso não provisionado: sua conta corporativa não está cadastrada na base de usuários.',
      );
    }
    if (!user.active || user.blocked) {
      throw new ForbiddenException('Conta inativa ou bloqueada na base corporativa.');
    }
    return user;
  }
}
