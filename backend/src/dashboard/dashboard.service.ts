import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DashboardFilters {
  from?: string;
  to?: string;
  leadSource?: string;
  uf?: string;
}

/**
 * Indicadores executivos (RN-018/RN-020). Consultas agregadas em SQL puro —
 * os números devem conferir com o banco, não com caches da aplicação.
 */
@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** WHERE compartilhado: filtros opcionais de período/origem/UF. */
  private filters(f: DashboardFilters, alias = 'o'): { where: string; params: unknown[] } {
    const clauses: string[] = ['true'];
    const params: unknown[] = [];
    if (f.from) {
      params.push(f.from);
      clauses.push(`${alias}.created_at >= $${params.length}`);
    }
    if (f.to) {
      params.push(f.to);
      clauses.push(`${alias}.created_at <= $${params.length}`);
    }
    if (f.leadSource) {
      params.push(f.leadSource);
      clauses.push(`${alias}.lead_source = $${params.length}`);
    }
    if (f.uf) {
      params.push(f.uf);
      clauses.push(`exists (select 1 from opp_clients c where c.id = ${alias}.client_id and c.uf = $${params.length})`);
    }
    return { where: clauses.join(' and '), params };
  }

  async summary(f: DashboardFilters) {
    const { where, params } = this.filters(f);
    const [row] = await this.db.query<[Record<string, string | null>]>(
      `select
         coalesce(sum(o.valor_estimado) filter (where o.status = 'aberta'), 0)             as pipeline_total,
         count(*)                                                                          as total,
         count(*) filter (where o.status = 'aberta')                                       as abertas,
         count(*) filter (where o.status = 'ganha')                                        as ganhas,
         count(*) filter (where o.status in ('ganha','perdida','cancelada'))               as encerradas,
         count(*) filter (where o.status = 'aberta' and o.expected_close_date < current_date) as vencidas,
         coalesce(sum(o.valor_estimado * coalesce(o.probabilidade, 0) / 100.0)
                  filter (where o.status = 'aberta'), 0)                                   as previsao_ponderada
       from opp_opportunities o where ${where}`,
      params,
    );
    const encerradas = Number(row.encerradas ?? 0);
    return {
      pipelineTotal: Number(row.pipeline_total),
      totalOpportunities: Number(row.total),
      open: Number(row.abertas),
      won: Number(row.ganhas),
      conversionRate: encerradas === 0 ? null : Number((Number(row.ganhas) / encerradas).toFixed(4)),
      overdue: Number(row.vencidas),
      weightedForecast: Number(row.previsao_ponderada),
    };
  }

  async byStage(f: DashboardFilters) {
    const { where, params } = this.filters(f);
    return (
      await this.db.query<Array<Record<string, string>>>(
        `select s.id as "stageId", s.name, s.position,
                count(o.id) as count, coalesce(sum(o.valor_estimado), 0) as "totalValue"
           from opp_stages s
           left join opp_opportunities o on o.stage_id = s.id and o.status = 'aberta' and ${where}
          where s.active
          group by s.id, s.name, s.position
          order by s.position`,
        params,
      )
    ).map((r) => ({ ...r, count: Number(r.count), totalValue: Number(r.totalValue), position: Number(r.position) }));
  }

  async bySource(f: DashboardFilters) {
    const { where, params } = this.filters(f);
    return (
      await this.db.query<Array<Record<string, string>>>(
        `select o.lead_source as source, count(*) as count,
                coalesce(sum(o.valor_estimado), 0) as "totalValue"
           from opp_opportunities o
          where ${where}
          group by o.lead_source`,
        params,
      )
    ).map((r) => ({ ...r, count: Number(r.count), totalValue: Number(r.totalValue) }));
  }

  /** Tempo médio por etapa em dias, via histórico de transições (RN-020). */
  async stageDurations(f: DashboardFilters) {
    const { where, params } = this.filters(f);
    return (
      await this.db.query<Array<Record<string, string>>>(
        `with spans as (
           select t.from_stage_id as stage_id,
                  t.moved_at - lag(t.moved_at) over (partition by t.opportunity_id order by t.moved_at) as span
             from opp_stage_transitions t
             join opp_opportunities o on o.id = t.opportunity_id
            where ${where}
         )
         select s.id as "stageId", s.name, s.position,
                round(avg(extract(epoch from sp.span) / 86400.0)::numeric, 1) as "avgDays"
           from opp_stages s
           join spans sp on sp.stage_id = s.id
          where sp.span is not null
          group by s.id, s.name, s.position
          order by s.position`,
        params,
      )
    ).map((r) => ({ ...r, avgDays: Number(r.avgDays), position: Number(r.position) }));
  }

  async partnerRanking(f: DashboardFilters) {
    const { where, params } = this.filters(f);
    return (
      await this.db.query<Array<Record<string, string>>>(
        `select p.id, p.name,
                count(o.id) as opportunities,
                coalesce(sum(o.valor_estimado) filter (where o.status = 'aberta'), 0) as pipeline,
                count(o.id) filter (where o.status = 'ganha') as won,
                coalesce(sum(o.valor_estimado) filter (where o.status = 'ganha'), 0) as "wonValue"
           from opp_partners p
           join opp_opportunities o on o.partner_id = p.id and ${where}
          group by p.id, p.name
          order by "wonValue" desc, pipeline desc
          limit 20`,
        params,
      )
    ).map((r) => ({
      ...r,
      opportunities: Number(r.opportunities),
      pipeline: Number(r.pipeline),
      won: Number(r.won),
      wonValue: Number(r.wonValue),
    }));
  }

  async managerRanking(f: DashboardFilters) {
    const { where, params } = this.filters(f);
    return (
      await this.db.query<Array<Record<string, string>>>(
        `select u.id, u.full_name as name,
                count(o.id) as opportunities,
                coalesce(sum(o.valor_estimado) filter (where o.status = 'aberta'), 0) as pipeline,
                count(o.id) filter (where o.status = 'ganha') as won,
                count(o.id) filter (where o.status in ('ganha','perdida','cancelada')) as closed
           from users u
           join opp_opportunities o on o.gestor_xpto_id = u.id and ${where}
          group by u.id, u.full_name
          order by won desc, pipeline desc
          limit 20`,
        params,
      )
    ).map((r) => ({
      id: Number(r.id),
      name: r.name,
      opportunities: Number(r.opportunities),
      pipeline: Number(r.pipeline),
      won: Number(r.won),
      conversionRate: Number(r.closed) === 0 ? null : Number((Number(r.won) / Number(r.closed)).toFixed(4)),
    }));
  }
}
