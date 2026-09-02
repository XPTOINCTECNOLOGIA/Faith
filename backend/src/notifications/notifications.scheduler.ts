import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../entities/misc.entities';
import { NotificationsService } from './notifications.service';

/** Lock consultivo do Postgres: com múltiplas réplicas, só uma executa o cron. */
const ADVISORY_LOCK_KEY = 730_001;

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    @InjectRepository(NotificationEntity) private readonly repo: Repository<NotificationEntity>,
    private readonly notifications: NotificationsService,
  ) {}

  /** RN-021: prazos vencidos e contratações próximas — diário às 08:00 UTC. */
  @Cron('0 8 * * *')
  async dailyDeadlines(): Promise<void> {
    const [{ locked }] = await this.repo.manager.query<[{ locked: boolean }]>(
      'select pg_try_advisory_lock($1) as locked',
      [ADVISORY_LOCK_KEY],
    );
    if (!locked) return;

    try {
      const overdue = await this.repo.manager.query<
        Array<{ id: string; code: string; gestor_xpto_id: string; gestor_serpro_id: string | null }>
      >(
        `select o.id, o.code, o.gestor_xpto_id, o.gestor_serpro_id
           from opp_opportunities o
          where o.status = 'aberta' and o.expected_close_date < current_date
            and not exists (
              select 1 from opp_notifications n
               where n.opportunity_id = o.id and n.type = 'prazo_vencido'
                 and n.created_at > now() - interval '7 days')`,
      );
      for (const o of overdue) {
        await this.notifications.notify(
          this.repo.manager,
          [Number(o.gestor_xpto_id), Number(o.gestor_serpro_id ?? 0)],
          'prazo_vencido',
          `Prazo vencido: ${o.code}`,
          'A data prevista de fechamento foi ultrapassada.',
          Number(o.id),
        );
      }

      const closing = await this.repo.manager.query<
        Array<{ id: string; code: string; gestor_xpto_id: string; gestor_serpro_id: string | null }>
      >(
        `select o.id, o.code, o.gestor_xpto_id, o.gestor_serpro_id
           from opp_opportunities o
           join opp_stages s on s.id = o.stage_id
          where o.status = 'aberta'
            and o.expected_close_date between current_date and current_date + interval '7 days'
            and s.code in ('aceite','contratacao')
            and not exists (
              select 1 from opp_notifications n
               where n.opportunity_id = o.id and n.type = 'contratacao_proxima'
                 and n.created_at > now() - interval '7 days')`,
      );
      for (const o of closing) {
        await this.notifications.notify(
          this.repo.manager,
          [Number(o.gestor_xpto_id), Number(o.gestor_serpro_id ?? 0)],
          'contratacao_proxima',
          `Contratação próxima: ${o.code}`,
          'Fechamento previsto nos próximos 7 dias.',
          Number(o.id),
        );
      }
      this.logger.log(`Cron diário: ${overdue.length} vencidas, ${closing.length} próximas.`);
    } finally {
      await this.repo.manager.query('select pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    }
  }
}
