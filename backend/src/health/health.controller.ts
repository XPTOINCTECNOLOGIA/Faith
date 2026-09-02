import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators';

@ApiTags('saúde')
@Controller('health')
@Public()
export class HealthController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get()
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness() {
    try {
      // Readiness exige o schema do portal presente (docs/11-implantacao.md §4).
      await this.db.query('select 1 from opp_stages limit 1');
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Banco indisponível ou migration 0073 não aplicada');
    }
  }
}
