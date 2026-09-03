import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from './decorators';
import { IdentityService, RequestUser } from './identity.service';

@ApiTags('identidade')
@ApiBearerAuth()
@Controller()
export class AuthController {
  constructor(private readonly identity: IdentityService) {}

  @Get('me')
  @ApiOperation({ summary: 'Usuário corrente (identidade da base compartilhada + permissões opp.*)' })
  me(@CurrentUser() user: RequestUser) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      displayName: user.displayName,
      profile: user.profileName,
      permissions: user.permissions,
    };
  }

  @Get('users')
  @RequirePermissions('opp.view')
  @ApiOperation({ summary: 'Busca usuários corporativos (selects de gestor/responsável)' })
  searchUsers(@Query('search') search = '') {
    return this.identity.searchUsers(search);
  }
}
