import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import type { RequestUser } from '../auth/identity.service';
import { PageQuery } from '../common/pagination';
import { CreatePartnerDto, UpdatePartnerDto } from './partners.dto';
import { PartnersService } from './partners.service';

class PartnerListQuery extends PageQuery {
  @IsOptional() @IsString() search?: string;
}

@ApiTags('parceiros')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(private readonly service: PartnersService) {}

  @Get()
  @RequirePermissions('opp.view')
  list(@Query() q: PartnerListQuery) {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermissions('opp.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermissions('opp.partner.manage')
  create(@Body() dto: CreatePartnerDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('opp.partner.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePartnerDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user.id);
  }
}
