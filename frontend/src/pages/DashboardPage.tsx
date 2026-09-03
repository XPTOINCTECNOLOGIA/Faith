import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid2 as Grid,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  formatBRL,
  LEAD_SOURCE_LABEL,
  radarParseBRL,
  type DashboardSummary,
  type Opportunity,
  type Page as PageOf,
  type RadarOpportunity,
} from '../lib/types';
import { DS, SOURCE_HEX, STATE_SOFT } from '../theme';

/** Paleta de dados (claro): séries categóricas fixas por origem; hue único. */
const SINGLE = '#2a78d6';
const TRACK = '#e9e7e4';
const SOURCE_ORDER = ['xpto', 'parceiro', 'serpro'] as const;

interface StageRow { stageId: number; name: string; position: number; count: number; totalValue: number }
interface SourceRow { source: string; count: number; totalValue: number }
interface AuditRow {
  id: number; entity: string; action: string; field: string | null;
  newValue: string | null; actorName: string | null; occurredAt: string; opportunityId: number | null;
}

const ACTION_LABEL: Record<string, string> = {
  create: 'criou', update: 'atualizou', transition: 'avançou etapa de', close: 'encerrou',
  reopen: 'reabriu', upload: 'anexou documento em', approve: 'aprovou documento de',
  reject: 'rejeitou documento de', promote: 'promoveu ao Pipeline', delete: 'removeu',
  deactivate: 'desativou', download: 'baixou documento de',
  'focal.vinculado': 'vinculou responsável SERPRO em', 'focal.removido': 'removeu responsável SERPRO de',
  'focal.principal': 'alterou responsável principal de',
};
const ENTITY_LABEL: Record<string, string> = {
  opportunity: 'oportunidade', client: 'cliente', partner: 'parceiro', document: 'documento',
  comment: 'comentário', radar: 'oportunidade do radar', focal_point: 'ponto focal',
  opportunity_focal_point: 'oportunidade', checklist_item: 'item de checklist',
};

export default function DashboardPage() {
  const summary = useQuery({
    queryKey: ['dash-summary'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });
  const byStage = useQuery({
    queryKey: ['dash-stage'],
    queryFn: () => api.get<StageRow[]>('/dashboard/by-stage'),
  });
  const bySource = useQuery({
    queryKey: ['dash-source'],
    queryFn: () => api.get<SourceRow[]>('/dashboard/by-source'),
  });
  const radar = useQuery({
    queryKey: ['radar', '', '', ''],
    queryFn: () => api.get<RadarOpportunity[]>('/radar'),
  });
  const open = useQuery({
    queryKey: ['dash-open'],
    queryFn: () => api.get<PageOf<Opportunity>>('/opportunities?status=aberta&pageSize=100'),
  });
  const audit = useQuery({
    queryKey: ['dash-audit'],
    queryFn: () => api.get<PageOf<AuditRow>>('/audit?pageSize=8'),
  });

  if (summary.isLoading) return <LinearProgress />;
  if (summary.error) return <Alert severity="error">Falha ao carregar o dashboard.</Alert>;
  const s = summary.data!;
  const rd = radar.data ?? [];

  const radarTotal = rd.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0);
  const pipelinePlusRadar = s.pipelineTotal + radarTotal;

  // Linha 2 — distribuições
  const porEsfera = (['Federal', 'Estadual', 'Municipal'] as const).map((es) => {
    const rows = rd.filter((r) => r.esfera === es);
    return { label: es, count: rows.length, value: rows.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0) };
  });
  const porUf = Object.entries(
    rd.reduce<Record<string, number>>((acc, r) => {
      const key = r.uf !== 'N/A' ? r.uf : r.pais;
      acc[key] = (acc[key] ?? 0) + radarParseBRL(r.valor_estimado_total_contrato);
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value, count: rd.filter((r) => (r.uf !== 'N/A' ? r.uf : r.pais) === label).length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
  const porHunter = ['XPTO', 'SERPRO', 'Não informado'].map((h) => {
    const rows = rd.filter((r) => r.hunter === h);
    return { label: h, count: rows.length, value: rows.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0) };
  }).filter((r) => r.count > 0);

  // Linha 3 — listas operacionais
  const topRadar = [...rd]
    .sort((a, b) => radarParseBRL(b.valor_estimado_total_contrato) - radarParseBRL(a.valor_estimado_total_contrato))
    .filter((r) => radarParseBRL(r.valor_estimado_total_contrato) > 0)
    .slice(0, 5);
  const vencimentos = (open.data?.items ?? [])
    .filter((o) => o.expectedCloseDate)
    .sort((a, b) => String(a.expectedCloseDate).localeCompare(String(b.expectedCloseDate)))
    .slice(0, 5);

  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={2} sx={{ mb: 2.5 }} flexWrap="wrap">
        <Typography variant="h4">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Visão executiva do pipeline e da prospecção XPTO + SERPRO
        </Typography>
      </Stack>

      {/* Linha 1 — KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Kpi
          label="Total de oportunidades"
          value={String(s.totalOpportunities + rd.length)}
          hint={`${s.open} no pipeline · ${rd.length} em prospecção`}
        />
        <Kpi label="Valor total (pipeline + radar)" value={formatBRL(pipelinePlusRadar)} hint={`${formatBRL(s.pipelineTotal)} em governança`} />
        <Kpi label="Previsão de receita" value={formatBRL(s.weightedForecast)} hint="ponderada por probabilidade" />
        <Kpi
          label="Taxa de conversão"
          value={s.conversionRate == null ? '—' : `${Math.round(s.conversionRate * 100)}%`}
          hint={s.overdue > 0 ? `${s.overdue} com prazo vencido` : 'nenhum prazo vencido'}
          warn={s.overdue > 0}
        />
      </Grid>

      {/* Linha 2 — distribuições */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <ChartCard title="Pipeline por estágio" to="/pipeline">
            <BarList
              rows={(byStage.data ?? []).map((r) => ({ key: r.stageId, label: r.name, value: r.totalValue, hint: `${r.count}` }))}
              color={SINGLE}
              money
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <ChartCard title="Prospecção por esfera" to="/oportunidades">
            <BarList
              rows={porEsfera.map((r) => ({ key: r.label, label: r.label, value: r.value, hint: `${r.count}` }))}
              color={SINGLE}
              money
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <ChartCard title="Prospecção por UF / país" to="/oportunidades">
            <BarList
              rows={porUf.map((r) => ({ key: r.label, label: r.label, value: r.value, hint: `${r.count}` }))}
              color={SINGLE}
              money
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <ChartCard title="Por hunter / origem" to="/oportunidades">
            <Stack spacing={1.5}>
              <BarList
                rows={porHunter.map((r) => ({ key: r.label, label: r.label, value: r.value, hint: `${r.count}` }))}
                color={SINGLE}
                money
              />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {SOURCE_ORDER.map((code) => {
                  const row = (bySource.data ?? []).find((r) => r.source === code);
                  if (!row?.count) return null;
                  return (
                    <Chip
                      key={code}
                      size="small"
                      label={`${LEAD_SOURCE_LABEL[code]}: ${row.count}`}
                      sx={{ bgcolor: `${SOURCE_HEX[code]}1a`, color: SOURCE_HEX[code] }}
                    />
                  );
                })}
              </Stack>
            </Stack>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Linha 3 — listas operacionais */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard title="Top oportunidades (prospecção)" to="/oportunidades">
            <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} spacing={1.25}>
              {topRadar.map((r) => (
                <Stack key={r.id} direction="row" spacing={1.5} alignItems="center">
                  <Typography sx={{ fontSize: 20, lineHeight: 1 }}>
                    {/\p{Regional_Indicator}/u.test(r.icone_bandeira) ? r.icone_bandeira : '🏳️'}
                  </Typography>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {r.objeto}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {r.esfera === 'Municipal' ? `${r.cidade}/${r.uf}` : r.esfera === 'Estadual' ? r.uf : r.pais}
                      {r.orgao_responsavel !== 'Não informado' ? ` · ${r.orgao_responsavel}` : ''}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatBRL(radarParseBRL(r.valor_estimado_total_contrato))}
                  </Typography>
                </Stack>
              ))}
              {topRadar.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Sem valores informados no radar.
                </Typography>
              )}
            </Stack>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard title="Próximos vencimentos" to="/pipeline">
            <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} spacing={1.25}>
              {vencimentos.map((o) => {
                const overdue = String(o.expectedCloseDate) < new Date().toISOString().slice(0, 10);
                const st = overdue ? STATE_SOFT.error : STATE_SOFT.warning;
                return (
                  <Stack
                    key={o.id}
                    component={Link}
                    to={`/oportunidades/${o.id}`}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {o.code} · {o.client?.name ?? o.objeto}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {o.stage?.name} · {formatBRL(o.valorEstimado)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={new Date(`${o.expectedCloseDate}T12:00:00`).toLocaleDateString('pt-BR')}
                      sx={{ bgcolor: st.bg, color: st.color }}
                    />
                  </Stack>
                );
              })}
              {vencimentos.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma oportunidade aberta com data de fechamento prevista.
                </Typography>
              )}
            </Stack>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard title="Atividades recentes" to="/auditoria">
            <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} spacing={1.25}>
              {(audit.data?.items ?? []).map((a) => (
                <Box key={a.id}>
                  <Typography variant="body2" noWrap>
                    <b>{a.actorName ?? 'Sistema'}</b>{' '}
                    {ACTION_LABEL[a.action] ?? a.action}{' '}
                    {ENTITY_LABEL[a.entity] ?? a.entity}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(a.occurredAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {a.newValue ? ` · ${String(a.newValue).slice(0, 48)}` : ''}
                  </Typography>
                </Box>
              ))}
              {(audit.data?.items ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Sem atividades registradas.
                </Typography>
              )}
            </Stack>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function Kpi({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <Grid size={{ xs: 6, lg: 3 }}>
      <Card>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="overline" sx={{ display: 'block', lineHeight: 1.6 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', my: 0.25 }}>
            {value}
          </Typography>
          {hint && (
            <Typography variant="caption" sx={{ color: warn ? 'warning.main' : 'text.secondary', fontWeight: warn ? 600 : 400 }}>
              {hint}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}

function ChartCard({ title, to, children }: { title: string; to?: string; children: React.ReactNode }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '0.9375rem' }}>
            {title}
          </Typography>
          {to && (
            <Typography component={Link} to={to} variant="caption" sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none' }}>
              Ver tudo →
            </Typography>
          )}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

interface BarRow { key: string | number; label: string; value: number; hint?: string }

function BarList({ rows, color, money }: { rows: BarRow[]; color: string; money?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Stack spacing={1}>
      {rows.map((r) => (
        <Tooltip key={r.key} title={`${r.label}: ${money ? formatBRL(r.value) : r.value}${r.hint ? ` · ${r.hint} oportunidade(s)` : ''}`}>
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
              <Typography variant="caption" sx={{ color: DS.textPrimary, fontWeight: 500 }} noWrap>
                {r.label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ml: 1 }}>
                {money ? formatBRL(r.value) : r.value}
              </Typography>
            </Stack>
            <Box sx={{ height: 6, borderRadius: 99, bgcolor: TRACK }}>
              <Box sx={{ height: 6, borderRadius: 99, bgcolor: color, width: `${Math.max(2, (r.value / max) * 100)}%` }} />
            </Box>
          </Box>
        </Tooltip>
      ))}
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Sem dados no período.
        </Typography>
      )}
    </Stack>
  );
}
