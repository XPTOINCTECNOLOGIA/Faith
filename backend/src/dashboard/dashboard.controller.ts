import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { RequirePermissions } from '../auth/decorators';
import { DashboardService } from './dashboard.service';

class DashboardQuery {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsIn(['xpto', 'parceiro', 'serpro']) leadSource?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) uf?: string;
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@RequirePermissions('opp.dashboard.view')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  summary(@Query() q: DashboardQuery) {
    return this.service.summary(q);
  }

  @Get('by-stage')
  byStage(@Query() q: DashboardQuery) {
    return this.service.byStage(q);
  }

  @Get('by-source')
  bySource(@Query() q: DashboardQuery) {
    return this.service.bySource(q);
  }

  @Get('stage-durations')
  stageDurations(@Query() q: DashboardQuery) {
    return this.service.stageDurations(q);
  }

  @Get('rankings/partners')
  partners(@Query() q: DashboardQuery) {
    return this.service.partnerRanking(q);
  }

  @Get('rankings/managers')
  managers(@Query() q: DashboardQuery) {
    return this.service.managerRanking(q);
  }
}
