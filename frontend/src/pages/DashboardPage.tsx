import { lazy, Suspense, useMemo } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid2 as Grid,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { brl0, buildPinGroups } from '../lib/geo';
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

const GeoMap = lazy(() => import('../components/GeoMap'));

/* Paleta de dados (validada com scripts/validate_palette.js — 6 checagens):
 * esferas em ordem fixa Federal/Estadual/Municipal; hue único para séries
 * de magnitude; cores de status reservadas para estado. */
const ESFERA_HEX: Record<string, string> = { Federal: '#1a56db', Estadual: '#d97706', Municipal: '#0e9384' };
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
  const navigate = useNavigate();
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

  const rd = radar.data ?? [];
  const pinGroups = useMemo(() => buildPinGroups(rd), [rd]);

  if (summary.isLoading) return <LinearProgress />;
  if (summary.error) return <Alert severity="error">Falha ao carregar o dashboard.</Alert>;
  const s = summary.data!;

  const radarTotal = rd.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0);
  const pipelinePlusRadar = s.pipelineTotal + radarTotal;

  const porEsfera = (['Federal', 'Estadual', 'Municipal'] as const)
    .map((es) => {
      const rows = rd.filter((r) => r.esfera === es);
      return { label: es, count: rows.length, value: rows.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0) };
    })
    .filter((g) => g.count > 0);
  const porHunter = ['XPTO', 'SERPRO', 'Não informado']
    .map((h) => {
      const rows = rd.filter((r) => r.hunter === h);
      return { label: h, count: rows.length, value: rows.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0) };
    })
    .filter((r) => r.count > 0);

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

      {/* Linha 1 — KPIs (o hero carrega a identidade do mapa) */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card
            sx={{
              height: '100%',
              border: 'none',
              background: `linear-gradient(135deg, ${DS.primary}, #3b82f6)`,
              color: '#ffffff',
              boxShadow: '0 10px 24px rgba(26,86,219,.28)',
            }}
          >
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="overline" sx={{ display: 'block', lineHeight: 1.6, color: 'rgba(255,255,255,.78)' }}>
                Valor total (pipeline + radar)
              </Typography>
              <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', my: 0.25, color: '#fff' }}>
                {formatBRL(pipelinePlusRadar)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.78)' }}>
                {formatBRL(s.pipelineTotal)} em governança · {formatBRL(radarTotal)} em prospecção
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Kpi
          label="Total de oportunidades"
          value={String(s.totalOpportunities + rd.length)}
          hint={`${s.open} no pipeline · ${rd.length} em prospecção`}
        />
        <Kpi label="Previsão de receita" value={formatBRL(s.weightedForecast)} hint="ponderada por probabilidade" />
        <Kpi
          label="Taxa de conversão"
          value={s.conversionRate == null ? '—' : `${Math.round(s.conversionRate * 100)}%`}
          hint={s.overdue > 0 ? `${s.overdue} com prazo vencido` : 'nenhum prazo vencido'}
          warn={s.overdue > 0}
        />
      </Grid>

      {/* Linha 2 — presença geográfica (o mapa) + composição */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <ChartCard title="Presença geográfica" to="/mapa" fill>
            <Box sx={{ height: { xs: 300, md: 372 }, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
              <Suspense
                fallback={
                  <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                    <CircularProgress size={28} />
                  </Box>
                }
              >
                <GeoMap groups={pinGroups} onPinClick={() => navigate('/mapa')} />
              </Suspense>
            </Box>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <ChartCard title="Prospecção por esfera">
              <Donut
                rows={porEsfera.map((g) => ({ label: g.label, value: g.value, count: g.count, color: ESFERA_HEX[g.label] }))}
                centerLabel="estimados"
                centerValue={brl0(radarTotal)}
              />
            </ChartCard>
            <ChartCard title="Por hunter / origem">
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
          </Stack>
        </Grid>
      </Grid>

      {/* Linha 3 — pipeline e listas operacionais */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard title="Pipeline por estágio" to="/pipeline">
            <BarList
              rows={(byStage.data ?? []).map((r) => ({ key: r.stageId, label: r.name, value: r.totalValue, hint: `${r.count}` }))}
              color={SINGLE}
              money
            />
          </ChartCard>
        </Grid>
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
                      {r.orgao_responsavel !== 'Não informado' ? r.orgao_responsavel : r.objeto}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {r.orgao_responsavel !== 'Não informado' ? `${r.objeto} · ` : ''}
                      {r.esfera === 'Municipal' ? `${r.cidade}/${r.uf}` : r.esfera === 'Estadual' ? r.uf : r.pais}
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
      </Grid>

      {/* Linha 4 — atividades recentes */}
      <ChartCard title="Atividades recentes" to="/auditoria">
        <Grid container spacing={1.5}>
          {(audit.data?.items ?? []).map((a) => (
            <Grid key={a.id} size={{ xs: 12, md: 6 }}>
              <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DS.primary, mt: 0.9, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    <b>{a.actorName ?? 'Sistema'}</b> {ACTION_LABEL[a.action] ?? a.action}{' '}
                    {ENTITY_LABEL[a.entity] ?? a.entity}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(a.occurredAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {a.newValue ? ` · ${String(a.newValue).slice(0, 56)}` : ''}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
          {(audit.data?.items ?? []).length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                Sem atividades registradas.
              </Typography>
            </Grid>
          )}
        </Grid>
      </ChartCard>
    </Box>
  );
}

/* ── componentes do dashboard ──────────────────────────────────────────────── */

function Kpi({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <Card sx={{ height: '100%' }}>
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

function ChartCard({
  title,
  to,
  fill,
  children,
}: {
  title: string;
  to?: string;
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ height: fill ? '100%' : undefined }}>
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

interface DonutRow { label: string; value: number; count: number; color: string }

/** Donut SVG (parte-de-um-todo, ≤ 4 segmentos): gap de 2px entre fatias,
 * tooltip por fatia e legenda com valores em tinta de texto. */
function Donut({ rows, centerValue, centerLabel }: { rows: DonutRow[]; centerValue: string; centerLabel: string }) {
  const total = rows.reduce((a, r) => a + r.value, 0);
  const R = 52;
  const STROKE = 16;
  const C = 2 * Math.PI * R;
  const GAP = rows.length > 1 ? 2.5 : 0; // px de respiro entre fatias
  let offset = 0;

  if (total <= 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sem valores informados para compor a distribuição.
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={2.5} alignItems="center" flexWrap="wrap" useFlexGap>
      <Box sx={{ position: 'relative', width: 148, height: 148, flexShrink: 0 }}>
        <svg width="148" height="148" viewBox="0 0 148 148" role="img" aria-label="Distribuição do valor por esfera">
          <g transform="rotate(-90 74 74)">
            {rows.map((r) => {
              const frac = r.value / total;
              const len = Math.max(0, frac * C - GAP);
              const el = (
                <circle
                  key={r.label}
                  cx="74"
                  cy="74"
                  r={R}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                >
                  <title>{`${r.label}: ${brl0(r.value)} · ${r.count} oportunidade(s) · ${Math.round(frac * 100)}%`}</title>
                </circle>
              );
              offset += frac * C;
              return el;
            })}
          </g>
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {centerValue}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {centerLabel}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Stack spacing={1} sx={{ minWidth: 0, flexGrow: 1 }}>
        {rows.map((r) => (
          <Stack key={r.label} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: r.color, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>
              {r.label}
            </Typography>
            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {brl0(r.value)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ width: 34, textAlign: 'right' }}>
              {Math.round((r.value / total) * 100)}%
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
