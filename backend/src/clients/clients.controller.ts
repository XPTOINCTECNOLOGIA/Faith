import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import type { RequestUser } from '../auth/identity.service';
import { PageQuery } from '../common/pagination';
import { CreateClientDto, UpdateClientDto } from './clients.dto';
import { ClientsService } from './clients.service';

class ClientListQuery extends PageQuery {
  @IsOptional() @IsString() search?: string;
}

@ApiTags('clientes')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @RequirePermissions('opp.view')
  list(@Query() q: ClientListQuery) {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermissions('opp.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermissions('opp.client.manage')
  create(@Body() dto: CreateClientDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('opp.client.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions('opp.client.manage')
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.deactivate(id, user.id);
  }
}
