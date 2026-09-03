import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import type { RequestUser } from '../auth/identity.service';
import {
  CloseDto,
  CommentDto,
  CreateOpportunityDto,
  JustificationDto,
  OpportunityListQuery,
  TransitionDto,
  UpdateOpportunityDto,
  WaiveDto,
} from './opportunities.dto';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('oportunidades')
@ApiBearerAuth()
@Controller()
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  @Get('opportunities')
  @RequirePermissions('opp.view')
  @ApiOperation({ summary: 'Lista paginada com filtros' })
  list(@Query() q: OpportunityListQuery) {
    return this.service.list(q);
  }

  @Get('opportunities/kanban')
  @RequirePermissions('opp.view')
  @ApiOperation({ summary: 'Pipeline visual: colunas por etapa com totais e progresso documental' })
  kanban() {
    return this.service.kanban();
  }

  @Post('opportunities')
  @RequirePermissions('opp.create')
  create(@Body() dto: CreateOpportunityDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user);
  }

  @Get('opportunities/:id')
  @RequirePermissions('opp.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Patch('opportunities/:id')
  @RequirePermissions('opp.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post('opportunities/:id/transition')
  @RequirePermissions('opp.move_stage')
  @ApiOperation({ summary: 'Avança para a próxima etapa (bloqueado por checklist — RN-001)' })
  @ApiResponse({ status: 409, description: 'Checklist obrigatório pendente: retorna details.pendingItems' })
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.transition(id, dto.toStageId, dto.justification, user);
  }

  @Post('opportunities/:id/close')
  @RequirePermissions('opp.close')
  close(@Param('id', ParseIntPipe) id: number, @Body() dto: CloseDto, @CurrentUser() user: RequestUser) {
    return this.service.close(id, dto, user);
  }

  @Post('opportunities/:id/reopen')
  @RequirePermissions('opp.admin')
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JustificationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.reopen(id, dto.justification, user);
  }

  @Get('opportunities/:id/checklist')
  @RequirePermissions('opp.view')
  checklist(@Param('id', ParseIntPipe) id: number) {
    return this.service.checklist(id);
  }

  @Post('checklist-items/:id/waive')
  @RequirePermissions('opp.checklist.waive')
  waive(@Param('id', ParseIntPipe) id: number, @Body() dto: WaiveDto, @CurrentUser() user: RequestUser) {
    return this.service.waiveItem(id, dto.justification, user);
  }

  @Get('opportunities/:id/history')
  @RequirePermissions('opp.view')
  history(@Param('id', ParseIntPipe) id: number) {
    return this.service.history(id);
  }

  @Get('opportunities/:id/comments')
  @RequirePermissions('opp.view')
  comments(@Param('id', ParseIntPipe) id: number) {
    return this.service.comments(id);
  }

  @Post('opportunities/:id/comments')
  @RequirePermissions('opp.comment')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addComment(id, dto.body, user);
  }
}
