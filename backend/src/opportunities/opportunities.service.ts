import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../auth/identity.service';
import { Page, toPage } from '../common/pagination';
import {
  ChecklistItemEntity,
  CommentEntity,
  OpportunityEntity,
  StageTransitionEntity,
} from '../entities/opportunity.entities';
import { StageEntity } from '../entities/stage.entities';
import { NotificationsService } from '../notifications/notifications.service';
import { StagesService } from '../stages/stages.service';
import {
  CloseDto,
  CreateOpportunityDto,
  OpportunityListQuery,
  UpdateOpportunityDto,
} from './opportunities.dto';

const CODE_LOCK_KEY = 730_100;

const AUDITABLE_FIELDS: Array<keyof OpportunityEntity & string> = [
  'leadSource', 'clientId', 'partnerId', 'objeto', 'solucao', 'valorEstimado',
  'receitaPrevista', 'probabilidade', 'complexidade', 'situacaoComercial',
  'gestorXptoId', 'gestorSerproId', 'expectedCloseDate', 'prazoEstimado', 'observacoes',
];

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly stages: StagesService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Consulta ───────────────────────────────────────────────────────────────

  async list(q: OpportunityListQuery): Promise<Page<OpportunityEntity>> {
    const qb = this.db
      .getRepository(OpportunityEntity)
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.client', 'client')
      .leftJoinAndSelect('o.partner', 'partner')
      .leftJoinAndSelect('o.stage', 'stage')
      .leftJoinAndSelect('o.gestorXpto', 'gestorXpto');

    if (q.stageId) qb.andWhere('o.stage_id = :stageId', { stageId: q.stageId });
    if (q.status) qb.andWhere('o.status = :status', { status: q.status });
    if (q.leadSource) qb.andWhere('o.lead_source = :leadSource', { leadSource: q.leadSource });
    if (q.partnerId) qb.andWhere('o.partner_id = :partnerId', { partnerId: q.partnerId });
    if (q.clientId) qb.andWhere('o.client_id = :clientId', { clientId: q.clientId });
    if (q.uf) qb.andWhere('client.uf = :uf', { uf: q.uf });
    if (q.minValue != null) qb.andWhere('o.valor_estimado >= :minValue', { minValue: q.minValue });
    if (q.maxValue != null) qb.andWhere('o.valor_estimado <= :maxValue', { maxValue: q.maxValue });
    if (q.gestorId) {
      qb.andWhere('(o.gestor_xpto_id = :gestorId or o.gestor_serpro_id = :gestorId)', { gestorId: q.gestorId });
    }
    if (q.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('o.code ilike :search', { search: `%${q.search}%` })
            .orWhere('o.objeto ilike :search')
            .orWhere('client.name ilike :search'),
        ),
      );
    }

    const [items, total] = await qb
      .orderBy('o.updated_at', 'DESC')
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();
    return toPage(items, total, q);
  }

  /** Kanban: colunas por etapa com totais e progresso documental por card. */
  async kanban() {
    const rows = await this.db.query<
      Array<{
        stage_id: string; stage_code: string; stage_name: string; stage_color: string | null;
        stage_position: number; is_terminal: boolean;
        id: string | null; code: string | null; client_name: string | null;
        valor_estimado: string | null; probabilidade: number | null; lead_source: string | null;
        status: string | null; expected_close_date: string | null;
        required_total: string | null; required_done: string | null;
      }>
    >(
      `select s.id as stage_id, s.code as stage_code, s.name as stage_name, s.color as stage_color,
              s.position as stage_position, s.is_terminal,
              o.id, o.code, c.name as client_name, o.valor_estimado, o.probabilidade,
              o.lead_source, o.status, o.expected_close_date,
              ci.required_total, ci.required_done
         from opp_stages s
         left join opp_opportunities o on o.stage_id = s.id and o.status = 'aberta'
         left join opp_clients c on c.id = o.client_id
         left join lateral (
           select count(*) filter (where i.required) as required_total,
                  count(*) filter (where i.required and i.status in ('aprovado','dispensado')) as required_done
             from opp_checklist_items i
            where i.opportunity_id = o.id and i.stage_id = o.stage_id
         ) ci on true
        where s.active
        order by s.position, o.updated_at desc nulls last`,
    );

    const columns = new Map<number, {
      stageId: number; code: string; name: string; color: string | null; position: number;
      isTerminal: boolean; count: number; totalValue: number;
      cards: Array<Record<string, unknown>>;
    }>();

    for (const row of rows) {
      const stageId = Number(row.stage_id);
      if (!columns.has(stageId)) {
        columns.set(stageId, {
          stageId, code: row.stage_code, name: row.stage_name, color: row.stage_color,
          position: row.stage_position, isTerminal: row.is_terminal,
          count: 0, totalValue: 0, cards: [],
        });
      }
      if (row.id == null) continue;
      const col = columns.get(stageId)!;
      col.count += 1;
      col.totalValue += Number(row.valor_estimado ?? 0);
      const requiredTotal = Number(row.required_total ?? 0);
      const requiredDone = Number(row.required_done ?? 0);
      col.cards.push({
        id: Number(row.id),
        code: row.code,
        clientName: row.client_name,
        valorEstimado: row.valor_estimado == null ? null : Number(row.valor_estimado),
        probabilidade: row.probabilidade,
        leadSource: row.lead_source,
        expectedCloseDate: row.expected_close_date,
        overdue: row.expected_close_date != null && new Date(row.expected_close_date) < new Date(),
        checklist: {
          requiredTotal,
          requiredDone,
          percent: requiredTotal === 0 ? 100 : Math.round((requiredDone / requiredTotal) * 100),
        },
      });
    }
    return [...columns.values()].sort((a, b) => a.position - b.position);
  }

  async get(id: number): Promise<OpportunityEntity> {
    const opp = await this.db.getRepository(OpportunityEntity).findOne({
      where: { id },
      relations: { client: true, partner: true, stage: true, gestorXpto: true, gestorSerpro: true },
    });
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');
    return opp;
  }

  // ── Mutações ───────────────────────────────────────────────────────────────

  async create(dto: CreateOpportunityDto, user: RequestUser): Promise<OpportunityEntity> {
    if (dto.leadSource === 'parceiro' && !dto.partnerId) {
      throw new UnprocessableEntityException('Origem "parceiro" exige parceiro vinculado (RN-005)');
    }
    const first = await this.stages.first();
    if (!first) throw new ConflictException('Nenhuma etapa ativa configurada');

    return this.db.transaction(async (manager) => {
      const code = await this.nextCode(manager);
      const opp = await manager.save(
        manager.create(OpportunityEntity, {
          ...dto,
          code,
          stageId: first.id,
          status: 'aberta',
          createdBy: user.id,
        }),
      );
      await manager.insert(StageTransitionEntity, {
        opportunityId: opp.id,
        fromStageId: null,
        toStageId: first.id,
        movedBy: user.id,
        snapshot: { valorEstimado: dto.valorEstimado ?? null, probabilidade: dto.probabilidade ?? null } as any,
      });
      await this.audit.log(manager, [
        { entity: 'opportunity', entityId: opp.id, opportunityId: opp.id, action: 'create', actorId: user.id },
      ]);
      await this.notifications.notify(
        manager,
        [dto.gestorXptoId, dto.gestorSerproId ?? 0],
        'nova_oportunidade',
        `Nova oportunidade ${code}`,
        dto.objeto,
        opp.id,
      );
      return opp;
    });
  }

  /** Código sequencial por ano (RN-003), protegido por advisory lock transacional. */
  private async nextCode(manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    await manager.query('select pg_advisory_xact_lock($1, $2)', [CODE_LOCK_KEY, year]);
    const [{ max }] = await manager.query<[{ max: string | null }]>(
      `select max(split_part(code, '-', 3)::int) as max from opp_opportunities where code like $1`,
      [`OPP-${year}-%`],
    );
    const next = (Number(max ?? 0) + 1).toString().padStart(4, '0');
    return `OPP-${year}-${next}`;
  }

  async update(id: number, dto: UpdateOpportunityDto, user: RequestUser): Promise<OpportunityEntity> {
    const opp = await this.get(id);
    if (opp.status !== 'aberta' && !user.permissions.includes('opp.admin')) {
      throw new ForbiddenException('Oportunidade encerrada é imutável (RN-008); reabertura exige opp.admin');
    }
    if ((dto.leadSource ?? opp.leadSource) === 'parceiro' && !(dto.partnerId ?? opp.partnerId)) {
      throw new UnprocessableEntityException('Origem "parceiro" exige parceiro vinculado (RN-005)');
    }
    return this.db.transaction(async (manager) => {
      const entries = this.audit.diff(
        { entity: 'opportunity', entityId: id, opportunityId: id, action: 'update', actorId: user.id },
        opp,
        dto,
        AUDITABLE_FIELDS,
      );
      Object.assign(opp, dto);
      const saved = await manager.save(opp);
      await this.audit.log(manager, entries);
      return saved;
    });
  }

  /**
   * RN-001/RN-002: transição vigiada. A API devolve a lista de pendências
   * (o trigger do banco é a última linha de defesa, não a UX).
   */
  async transition(id: number, toStageId: number, justification: string | undefined, user: RequestUser) {
    return this.db.transaction(async (manager) => {
      const opp = await manager.findOne(OpportunityEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!opp) throw new NotFoundException('Oportunidade não encontrada');
      if (opp.status !== 'aberta') {
        throw new ConflictException('Oportunidade encerrada não transiciona (RN-008)');
      }

      const current = await this.stages.get(opp.stageId);
      const target = await this.stages.get(toStageId);

      if (target.isTerminal) {
        throw new UnprocessableEntityException('Use POST /opportunities/:id/close para encerrar (RN-008)');
      }
      const next = await this.stages.nextOf(current);
      if (!next || next.id !== target.id) {
        throw new UnprocessableEntityException({
          message: 'Transição inválida: a etapa destino deve ser a próxima da esteira (RN-002)',
        });
      }

      const pending = await manager.find(ChecklistItemEntity, {
        where: { opportunityId: id, stageId: current.id, required: true },
      });
      const pendingItems = pending.filter((i) => !['aprovado', 'dispensado'].includes(i.status));
      if (pendingItems.length) {
        throw new ConflictException({
          error: 'StageBlocked',
          message: `Avanço bloqueado: ${pendingItems.length} documento(s) obrigatório(s) pendente(s) na etapa ${current.name} (RN-001).`,
          details: {
            pendingItems: pendingItems.map((i) => ({ checklistItemId: i.id, name: i.name, status: i.status })),
          },
        });
      }

      opp.stageId = target.id;
      await manager.save(opp);
      await this.instantiateChecklist(manager, opp.id, target);
      await manager.insert(StageTransitionEntity, {
        opportunityId: id,
        fromStageId: current.id,
        toStageId: target.id,
        movedBy: user.id,
        justification: justification ?? null,
        snapshot: { valorEstimado: opp.valorEstimado, probabilidade: opp.probabilidade } as any,
      });
      await this.audit.log(manager, [
        {
          entity: 'opportunity', entityId: id, opportunityId: id, action: 'transition',
          field: 'stage', oldValue: current.name, newValue: target.name, actorId: user.id,
        },
      ]);
      await this.notifications.notify(
        manager,
        [opp.gestorXptoId, opp.gestorSerproId ?? 0, opp.createdBy],
        'mudanca_etapa',
        `${opp.code} avançou para ${target.name}`,
        justification ?? '',
        id,
      );
      return this.getWithManager(manager, id);
    });
  }

  /** RN-007 (espelho do trigger do banco — mantém a API autossuficiente em testes). */
  private async instantiateChecklist(manager: EntityManager, opportunityId: number, stage: StageEntity) {
    await manager.query(
      `insert into opp_checklist_items (opportunity_id, template_id, stage_id, name, required)
       select $1, t.id, t.stage_id, t.name, t.required
         from opp_checklist_templates t
        where t.stage_id = $2 and t.active
          and not exists (
            select 1 from opp_checklist_items ci
             where ci.opportunity_id = $1 and ci.template_id = t.id)`,
      [opportunityId, stage.id],
    );
  }

  async close(id: number, dto: CloseDto, user: RequestUser) {
    return this.db.transaction(async (manager) => {
      const opp = await manager.findOne(OpportunityEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!opp) throw new NotFoundException('Oportunidade não encontrada');
      if (opp.status !== 'aberta') throw new ConflictException('Oportunidade já encerrada');

      const terminal = await this.stages.terminal();
      if (!terminal) throw new ConflictException('Etapa terminal não configurada');

      const fromStageId = opp.stageId;
      opp.stageId = terminal.id;
      opp.status = dto.outcome;
      opp.closureReason = dto.justification;
      await manager.save(opp);
      await manager.insert(StageTransitionEntity, {
        opportunityId: id,
        fromStageId,
        toStageId: terminal.id,
        movedBy: user.id,
        justification: dto.justification,
        snapshot: { outcome: dto.outcome, valorEstimado: opp.valorEstimado } as any,
      });
      await this.audit.log(manager, [
        {
          entity: 'opportunity', entityId: id, opportunityId: id, action: 'close',
          field: 'status', oldValue: 'aberta', newValue: dto.outcome, actorId: user.id,
        },
      ]);
      return this.getWithManager(manager, id);
    });
  }

  /** RN-016: reabre para a etapa anterior ao encerramento. */
  async reopen(id: number, justification: string, user: RequestUser) {
    return this.db.transaction(async (manager) => {
      const opp = await manager.findOne(OpportunityEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!opp) throw new NotFoundException('Oportunidade não encontrada');
      if (opp.status === 'aberta') throw new ConflictException('Oportunidade não está encerrada');

      const lastClose = await manager.findOne(StageTransitionEntity, {
        where: { opportunityId: id, toStageId: opp.stageId },
        order: { movedAt: 'DESC' },
      });
      if (!lastClose?.fromStageId) throw new ConflictException('Histórico de encerramento não encontrado');

      const previousStatus = opp.status;
      opp.stageId = lastClose.fromStageId;
      opp.status = 'aberta';
      opp.closureReason = null;
      await manager.save(opp);
      await manager.insert(StageTransitionEntity, {
        opportunityId: id,
        fromStageId: lastClose.toStageId,
        toStageId: lastClose.fromStageId,
        movedBy: user.id,
        justification,
      });
      await this.audit.log(manager, [
        {
          entity: 'opportunity', entityId: id, opportunityId: id, action: 'reopen',
          field: 'status', oldValue: previousStatus, newValue: 'aberta', actorId: user.id,
        },
      ]);
      return this.getWithManager(manager, id);
    });
  }

  private getWithManager(manager: EntityManager, id: number) {
    return manager.findOne(OpportunityEntity, {
      where: { id },
      relations: { client: true, partner: true, stage: true, gestorXpto: true, gestorSerpro: true },
    });
  }

  // ── Checklist / histórico / comentários ────────────────────────────────────

  async checklist(id: number) {
    const opp = await this.get(id);
    const items = await this.db.query<Array<Record<string, unknown>>>(
      `select ci.id, ci.stage_id as "stageId", s.name as "stageName", s.position as "stagePosition",
              ci.name, ci.required, ci.status, ci.document_id as "documentId",
              ci.waived_reason as "waivedReason",
              (ci.stage_id = $2) as "isCurrentStage"
         from opp_checklist_items ci
         join opp_stages s on s.id = ci.stage_id
        where ci.opportunity_id = $1
        order by s.position, ci.id`,
      [id, opp.stageId],
    );
    const current = items.filter((i) => i.isCurrentStage && i.required);
    const done = current.filter((i) => ['aprovado', 'dispensado'].includes(String(i.status)));
    return {
      items,
      currentStage: {
        requiredTotal: current.length,
        requiredDone: done.length,
        percent: current.length === 0 ? 100 : Math.round((done.length / current.length) * 100),
        canAdvance: done.length === current.length,
      },
    };
  }

  async waiveItem(itemId: number, justification: string, user: RequestUser) {
    return this.db.transaction(async (manager) => {
      const item = await manager.findOneBy(ChecklistItemEntity, { id: itemId });
      if (!item) throw new NotFoundException('Item de checklist não encontrado');
      if (item.status === 'aprovado') throw new ConflictException('Item aprovado não precisa de dispensa');
      item.status = 'dispensado';
      item.waivedBy = user.id;
      item.waivedReason = justification;
      await manager.save(item);
      await this.audit.log(manager, [
        {
          entity: 'checklist_item', entityId: itemId, opportunityId: item.opportunityId,
          action: 'waive', newValue: justification, actorId: user.id,
        },
      ]);
      return item;
    });
  }

  async history(id: number) {
    await this.get(id);
    const transitions = await this.db.getRepository(StageTransitionEntity).find({
      where: { opportunityId: id },
      order: { movedAt: 'DESC' },
    });
    const auditRows = await this.db.query(
      `select a.action, a.field, a.old_value as "oldValue", a.new_value as "newValue",
              a.occurred_at as "occurredAt", u.full_name as "actorName", a.entity
         from opp_audit_log a join users u on u.id = a.actor_id
        where a.opportunity_id = $1
        order by a.occurred_at desc
        limit 500`,
      [id],
    );
    return { transitions, audit: auditRows };
  }

  async comments(id: number) {
    await this.get(id);
    return this.db.getRepository(CommentEntity).find({
      where: { opportunityId: id },
      relations: { author: true },
      order: { createdAt: 'ASC' },
    });
  }

  async addComment(id: number, body: string, user: RequestUser) {
    await this.get(id);
    return this.db.transaction(async (manager) => {
      const comment = await manager.save(
        manager.create(CommentEntity, { opportunityId: id, authorId: user.id, body }),
      );
      await this.audit.log(manager, [
        { entity: 'comment', entityId: comment.id, opportunityId: id, action: 'create', actorId: user.id },
      ]);
      return comment;
    });
  }
}
