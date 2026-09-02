import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { NotificationEntity, NotificationType } from '../entities/misc.entities';
import { MailerService } from './mailer.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity) private readonly repo: Repository<NotificationEntity>,
    private readonly mailer: MailerService,
  ) {}

  /**
   * Cria notificações internas (na transação corrente) e agenda o canal
   * e-mail fora dela (falha de SMTP não desfaz a mutação de negócio).
   */
  async notify(
    manager: EntityManager,
    userIds: number[],
    type: NotificationType,
    title: string,
    body: string,
    opportunityId?: number,
  ): Promise<void> {
    const targets = [...new Set(userIds)].filter(Boolean);
    if (!targets.length) return;
    const rows = await manager.save(
      NotificationEntity,
      targets.map((userId) =>
        manager.create(NotificationEntity, { userId, type, title, body, opportunityId: opportunityId ?? null }),
      ),
    );
    setImmediate(() => void this.dispatchEmails(rows.map((r) => r.id)));
  }

  private async dispatchEmails(ids: number[]): Promise<void> {
    try {
      const rows = await this.repo.manager.query<Array<{ id: string; email: string; title: string; body: string | null }>>(
        `select n.id, u.email, n.title, n.body
           from opp_notifications n join users u on u.id = n.user_id
          where n.id = any($1::bigint[]) and n.email_sent_at is null`,
        [ids],
      );
      for (const row of rows) {
        const sent = await this.mailer.send(row.email, `[Portal de Oportunidades] ${row.title}`, row.body ?? row.title);
        if (sent) await this.repo.update(Number(row.id), { emailSentAt: new Date() });
      }
    } catch (error) {
      this.logger.warn(`Envio de e-mail falhou (notificações internas preservadas): ${String(error)}`);
    }
  }

  listMine(userId: number, unreadOnly: boolean) {
    return this.repo.find({
      where: unreadOnly ? { userId, readAt: IsNull() } : { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markRead(userId: number, id: number): Promise<void> {
    await this.repo.update({ id, userId }, { readAt: new Date() });
  }

  async markAllRead(userId: number): Promise<void> {
    await this.repo.update({ userId, readAt: IsNull() }, { readAt: new Date() });
  }
}
