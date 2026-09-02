import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { RequestUser } from './identity.service';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const REQUIRED_PERMISSIONS = 'requiredPermissions';
/** Exige que o usuário possua TODAS as permissões listadas (códigos opp.*). */
export const RequirePermissions = (...codes: string[]) => SetMetadata(REQUIRED_PERMISSIONS, codes);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser =>
    ctx.switchToHttp().getRequest().user as RequestUser,
);
