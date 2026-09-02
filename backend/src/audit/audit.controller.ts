import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { RequirePermissions } from '../auth/decorators';
import { PageQuery } from '../common/pagination';
import { AuditService } from './audit.service';

class AuditQueryDto extends PageQuery {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() actorId?: number;
  @IsOptional() @IsString() entity?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @Type(() => Number) @IsInt() opportunityId?: number;
}

@ApiTags('auditoria')
@ApiBearerAuth()
@Controller('audit')
@RequirePermissions('opp.audit.view')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Trilha de auditoria (filtros por período, ator, entidade, ação)' })
  search(@Query() q: AuditQueryDto) {
    return this.audit.search(q);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="auditoria.csv"')
  @ApiOperation({ summary: 'Exportação CSV da trilha' })
  async export(@Query() q: AuditQueryDto): Promise<string> {
    const page = await this.audit.search({ ...q, page: 1, pageSize: 100 } as AuditQueryDto);
    const header = 'occurred_at;actor_id;entity;entity_id;opportunity_id;action;field;old_value;new_value';
    const esc = (v: unknown) => String(v ?? '').replaceAll(';', ',').replaceAll('\n', ' ');
    const rows = page.items.map((r) =>
      [r.occurredAt.toISOString(), r.actorId, r.entity, r.entityId, r.opportunityId, r.action, r.field, r.oldValue, r.newValue]
        .map(esc)
        .join(';'),
    );
    return [header, ...rows].join('\n');
  }
}
