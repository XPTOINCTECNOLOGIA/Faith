import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AuditLogEntity } from '../entities/misc.entities';
import { Page, PageQuery, toPage } from '../common/pagination';

export interface AuditContext {
  requestId: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditEntry {
  entity: string;
  entityId: number;
  opportunityId?: number | null;
  action: string;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  actorId: number;
}

export interface AuditQuery extends PageQuery {
  from?: string;
  to?: string;
  actorId?: number;
  entity?: string;
  action?: string;
  opportunityId?: number;
}

/**
 * RN-015: toda mutação gera trilha, gravada NA MESMA transação da mutação
 * (passe o EntityManager transacional em `log`). A tabela é append-only no
 * banco (trigger opp_audit_protect) — este serviço só insere e consulta.
 */
@Injectable()
export class AuditService {
  static context = new AsyncLocalStorage<AuditContext>();

  constructor(
    @InjectRepository(AuditLogEntity) private readonly repo: Repository<AuditLogEntity>,
  ) {}

  async log(manager: EntityManager, entries: AuditEntry[]): Promise<void> {
    if (!entries.length) return;
    const ctx = AuditService.context.getStore();
    await manager.insert(
      AuditLogEntity,
      entries.map((e) => ({
        entity: e.entity,
        entityId: e.entityId,
        opportunityId: e.opportunityId ?? null,
        action: e.action,
        field: e.field ?? null,
        oldValue: e.oldValue == null ? null : String(e.oldValue),
        newValue: e.newValue == null ? null : String(e.newValue),
        actorId: e.actorId,
        metadata: ctx ? { requestId: ctx.requestId, ip: ctx.ip, userAgent: ctx.userAgent } : null,
      })),
    );
  }

  /** Diff campo a campo sobre uma whitelist de campos auditáveis. */
  diff<T extends object>(
    base: Omit<AuditEntry, 'field' | 'oldValue' | 'newValue'>,
    before: T,
    after: Partial<T>,
    fields: Array<keyof T & string>,
  ): AuditEntry[] {
    const entries: AuditEntry[] = [];
    for (const field of fields) {
      if (!(field in after)) continue;
      const oldValue = before[field];
      const newValue = after[field] as unknown;
      if (String(oldValue ?? '') === String(newValue ?? '')) continue;
      entries.push({ ...base, action: 'update', field, oldValue, newValue });
    }
    return entries;
  }

  async search(q: AuditQuery): Promise<Page<AuditLogEntity>> {
    const where: FindOptionsWhere<AuditLogEntity> = {};
    if (q.actorId) where.actorId = q.actorId;
    if (q.entity) where.entity = q.entity;
    if (q.action) where.action = q.action;
    if (q.opportunityId) where.opportunityId = q.opportunityId;
    if (q.from && q.to) where.occurredAt = Between(new Date(q.from), new Date(q.to));

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { occurredAt: 'DESC' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    });
    return toPage(items, total, q);
  }
}
