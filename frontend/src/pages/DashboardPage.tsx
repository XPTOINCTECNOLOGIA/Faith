import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid2 as Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatBRL, LEAD_SOURCE_LABEL, type DashboardSummary } from '../lib/types';

/**
 * Paleta de dados validada (dataviz skill — references/palette.md):
 * séries categóricas em ordem fixa; hue único para séries simples.
 */
const VIZ = {
  light: { series: ['#2a78d6', '#eb6834', '#1baf7a'], single: '#2a78d6', track: '#e9e7e4' },
  dark: { series: ['#3987e5', '#d95926', '#199e70'], single: '#3987e5', track: '#33322f' },
};
// Ordem fixa por entidade, nunca por ranking (regra da paleta categórica):
const SOURCE_ORDER = ['xpto', 'parceiro', 'serpro'] as const;

interface StageRow {
  stageId: number;
  name: string;
  position: number;
  count: number;
  totalValue: number;
}
interface SourceRow {
  source: string;
  count: number;
  totalValue: number;
}
interface DurationRow {
  stageId: number;
  name: string;
  position: number;
  avgDays: number;
}
interface PartnerRow {
  id: number;
  name: string;
  opportunities: number;
  pipeline: number;
  won: number;
  wonValue: number;
}
interface ManagerRow {
  id: number;
  name: string;
  opportunities: number;
  pipeline: number;
  won: number;
  conversionRate: number | null;
}

export default function DashboardPage() {
  const theme = useTheme();
  const viz = theme.palette.mode === 'dark' ? VIZ.dark : VIZ.light;
  const [leadSource, setLeadSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const qs = new URLSearchParams();
  if (leadSource) qs.set('leadSource', leadSource);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const summary = useQuery({
    queryKey: ['dash-summary', suffix],
    queryFn: () => api.get<DashboardSummary>(`/dashboard/summary${suffix}`),
  });
  const byStage = useQuery({
    queryKey: ['dash-stage', suffix],
    queryFn: () => api.get<StageRow[]>(`/dashboard/by-stage${suffix}`),
  });
  const bySource = useQuery({
    queryKey: ['dash-source', suffix],
    queryFn: () => api.get<SourceRow[]>(`/dashboard/by-source${suffix}`),
  });
  const durations = useQuery({
    queryKey: ['dash-durations', suffix],
    queryFn: () => api.get<DurationRow[]>(`/dashboard/stage-durations${suffix}`),
  });
  const partners = useQuery({
    queryKey: ['dash-partners', suffix],
    queryFn: () => api.get<PartnerRow[]>(`/dashboard/rankings/partners${suffix}`),
  });
  const managers = useQuery({
    queryKey: ['dash-managers', suffix],
    queryFn: () => api.get<ManagerRow[]>(`/dashboard/rankings/managers${suffix}`),
  });

  if (summary.isLoading) return <LinearProgress />;
  if (summary.error) return <Alert severity="error">Falha ao carregar o dashboard.</Alert>;
  const s = summary.data!;

  const sourceRows = SOURCE_ORDER.map((code, i) => ({
    code,
    color: viz.series[i],
    row: (bySource.data ?? []).find((r) => r.source === code),
  }));

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Dashboard executivo
        </Typography>
        <TextField select size="small" label="Origem" value={leadSource} onChange={(e) => setLeadSource(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">Todas</MenuItem>
          {SOURCE_ORDER.map((code) => (
            <MenuItem key={code} value={code}>
              {LEAD_SOURCE_LABEL[code]}
            </MenuItem>
          ))}
        </TextField>
        <TextField size="small" type="date" label="De" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="Até" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Kpi label="Pipeline total" value={formatBRL(s.pipelineTotal)} />
        <Kpi label="Oportunidades" value={`${s.open} abertas de ${s.totalOpportunities}`} />
        <Kpi label="Taxa de conversão" value={s.conversionRate == null ? '—' : `${Math.round(s.conversionRate * 100)}%`} />
        <Kpi label="Vencidas" value={String(s.overdue)} warning={s.overdue > 0} />
        <Kpi label="Previsão ponderada" value={formatBRL(s.weightedForecast)} />
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Funil — valor por etapa (abertas)">
            <BarList
              rows={(byStage.data ?? []).map((r) => ({
                key: r.stageId,
                label: r.name,
                value: r.totalValue,
                detail: `${r.count} oportunidade${r.count === 1 ? '' : 's'} · ${formatBRL(r.totalValue)}`,
                display: formatBRL(r.totalValue),
              }))}
              color={viz.single}
              track={viz.track}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Valor por origem do lead">
            <BarList
              rows={sourceRows.map(({ code, color, row }) => ({
                key: code,
                label: LEAD_SOURCE_LABEL[code],
                value: row?.totalValue ?? 0,
                detail: `${row?.count ?? 0} oportunidade${(row?.count ?? 0) === 1 ? '' : 's'} · ${formatBRL(row?.totalValue ?? 0)}`,
                display: formatBRL(row?.totalValue ?? 0),
                color,
              }))}
              color={viz.single}
              track={viz.track}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Tempo médio por etapa (dias)">
            {(durations.data ?? []).length === 0 ? (
              <Typography color="text.secondary">Sem transições suficientes para calcular.</Typography>
            ) : (
              <BarList
                rows={(durations.data ?? []).map((r) => ({
                  key: r.stageId,
                  label: r.name,
                  value: r.avgDays,
                  detail: `${r.avgDays} dia${r.avgDays === 1 ? '' : 's'} em média`,
                  display: String(r.avgDays),
                }))}
                color={viz.single}
                track={viz.track}
              />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Ranking de parceiros">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parceiro</TableCell>
                  <TableCell align="right">Oportunidades</TableCell>
                  <TableCell align="right">Pipeline</TableCell>
                  <TableCell align="right">Ganhas (R$)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(partners.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell align="right">{r.opportunities}</TableCell>
                    <TableCell align="right">{formatBRL(r.pipeline)}</TableCell>
                    <TableCell align="right">{formatBRL(r.wonValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Ranking de gestores">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Gestor</TableCell>
                  <TableCell align="right">Oportunidades</TableCell>
                  <TableCell align="right">Pipeline</TableCell>
                  <TableCell align="right">Conversão</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(managers.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell align="right">{r.opportunities}</TableCell>
                    <TableCell align="right">{formatBRL(r.pipeline)}</TableCell>
                    <TableCell align="right">{r.conversionRate == null ? '—' : `${Math.round(r.conversionRate * 100)}%`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function Kpi({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <Grid size={{ xs: 6, md: 2.4 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h6" fontWeight={700} color={warning ? 'warning.main' : 'text.primary'}>
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

interface BarRow {
  key: string | number;
  label: string;
  value: number;
  detail: string;
  display: string;
  color?: string;
}

/** Barras horizontais finas com hover por marca e rótulo direto no fim da barra. */
function BarList({ rows, color, track }: { rows: BarRow[]; color: string; track: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Stack spacing={1}>
      {rows.map((row) => (
        <Tooltip key={row.key} title={row.detail} placement="right" arrow>
          <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr 96px', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap color="text.secondary">
              {row.label}
            </Typography>
            <Box sx={{ bgcolor: track, borderRadius: '4px', height: 14 }}>
              <Box
                sx={{
                  width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`,
                  bgcolor: row.color ?? color,
                  height: 14,
                  borderRadius: '4px',
                }}
              />
            </Box>
            <Typography variant="body2" fontWeight={600} textAlign="right">
              {row.display}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  );
}
