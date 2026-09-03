import { Body, Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import type { RequestUser } from '../auth/identity.service';
import {
  CreateChecklistTemplateDto,
  CreateStageDto,
  UpdateChecklistTemplateDto,
  UpdateStageDto,
} from './stages.dto';
import { StagesService } from './stages.service';

@ApiTags('etapas')
@ApiBearerAuth()
@Controller()
export class StagesController {
  constructor(private readonly service: StagesService) {}

  @Get('stages')
  @RequirePermissions('opp.view')
  @ApiOperation({ summary: 'Etapas da esteira, ordenadas' })
  list(@Query('all', new ParseBoolPipe({ optional: true })) all?: boolean) {
    return this.service.list(all === true);
  }

  @Post('stages')
  @RequirePermissions('opp.config')
  create(@Body() dto: CreateStageDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id);
  }

  @Patch('stages/:id')
  @RequirePermissions('opp.config')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Get('stages/:id/checklist-templates')
  @RequirePermissions('opp.view')
  listTemplates(@Param('id', ParseIntPipe) id: number) {
    return this.service.listTemplates(id);
  }

  @Post('stages/:id/checklist-templates')
  @RequirePermissions('opp.config')
  createTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateChecklistTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createTemplate(id, dto, user.id);
  }

  @Patch('checklist-templates/:id')
  @RequirePermissions('opp.config')
  updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChecklistTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateTemplate(id, dto, user.id);
  }
}
