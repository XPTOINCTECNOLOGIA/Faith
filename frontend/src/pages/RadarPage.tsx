import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid2 as Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { UFS, radarParseBRL, radarValorMensal, type Opportunity, type RadarOpportunity } from '../lib/types';
import { DS, STATE_SOFT } from '../theme';

/* ── modelo de apresentação ─────────────────────────────────────────────────── */

const ESFERAS = ['Federal', 'Estadual', 'Municipal'] as const;
/** Esfera de apresentação: propostas internacionais formam grupo próprio. */
const GRUPOS = ['Federal', 'Estadual', 'Municipal', 'Internacional'] as const;
const grupoDe = (r: RadarOpportunity): string =>
  r.abrangencia === 'Internacional' ? 'Internacional' : r.esfera;

const brl0 = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const informado = (v: string) => v !== 'Não informado' && v !== 'N/A';

/** Health score: completude dos dados que sustentam forecast e follow-up. */
function healthScore(r: RadarOpportunity): number {
  const checks = [
    informado(r.orgao_responsavel),
    informado(r.valor_estimado_total_contrato),
    informado(r.tempo_contrato),
    informado(r.hunter),
    r.parceiro !== 'Não informado',
    informado(r.responsavel_serpro),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function healthTone(score: number) {
  if (score >= 80) return STATE_SOFT.success;
  if (score >= 50) return STATE_SOFT.warning;
  return STATE_SOFT.error;
}

function nextAction(r: RadarOpportunity): { label: string; tone: keyof typeof STATE_SOFT } {
  if (r.pipeline) {
    if (r.pipeline.status === 'ganha') return { label: 'Contrato ganho', tone: 'success' };
    if (r.pipeline.status !== 'aberta') return { label: `Encerrada (${r.pipeline.status})`, tone: 'neutral' };
    return { label: `No Pipeline · ${r.pipeline.stage?.name ?? ''}`, tone: 'info' };
  }
  if (!informado(r.valor_estimado_total_contrato)) return { label: 'Completar dados', tone: 'warning' };
  return { label: 'Promover ao Pipeline', tone: 'neutral' };
}

function localDe(r: RadarOpportunity): string {
  if (r.esfera === 'Federal') return r.pais;
  if (r.esfera === 'Estadual') return `${r.uf} · ${r.pais}`;
  return `${r.cidade}/${r.uf}`;
}

/** Ator principal da linha: o órgão responsável (a oportunidade é o 2º nível). */
function tituloDe(r: RadarOpportunity): string {
  return informado(r.orgao_responsavel) ? r.orgao_responsavel : r.objeto;
}

function subtituloDe(r: RadarOpportunity): string {
  return informado(r.orgao_responsavel) ? r.objeto : 'Órgão a definir';
}

function Bandeira({ item, size = 22 }: { item: RadarOpportunity; size?: number }) {
  const isEmoji = /\p{Regional_Indicator}/u.test(item.icone_bandeira);
  if (isEmoji) {
    return (
      <Tooltip title={item.pais}>
        <Typography component="span" sx={{ fontSize: size, lineHeight: 1 }}>
          {item.icone_bandeira}
        </Typography>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={item.icone_bandeira}>
      <Chip
        size="small"
        label={item.esfera === 'Estadual' ? item.uf : item.cidade.slice(0, 12)}
        sx={{ bgcolor: DS.primarySoft, color: DS.success, fontWeight: 700, minWidth: 44 }}
      />
    </Tooltip>
  );
}

function Badge({ label, tone }: { label: string; tone: keyof typeof STATE_SOFT }) {
  const t = STATE_SOFT[tone];
  return <Chip size="small" label={label} sx={{ bgcolor: t.bg, color: t.color }} />;
}

/* ── formulário ─────────────────────────────────────────────────────────────── */

interface FormState {
  abrangencia: string; esfera: string; pais: string; uf: string; cidade: string;
  objeto: string; orgao_responsavel: string; valor_estimado_total_contrato: string;
  periodo: string; tempo_contrato: string; responsavel_serpro: string;
  hunter: string; parceiro: string; nome_parceiro: string;
}

const EMPTY: FormState = {
  abrangencia: 'Nacional', esfera: 'Federal', pais: 'Brasil', uf: '', cidade: '',
  objeto: '', orgao_responsavel: '', valor_estimado_total_contrato: '', periodo: '',
  tempo_contrato: '', responsavel_serpro: '', hunter: '', parceiro: '', nome_parceiro: '',
};

/* ── página ─────────────────────────────────────────────────────────────────── */

export default function RadarPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canWrite = can('opp.create') || can('opp.update');
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  // aceita ?esfera= vindo do Dashboard (grupos de apresentação, incl. Internacional)
  const esferaParam = params.get('esfera') ?? '';
  const [esfera, setEsfera] = useState(
    (GRUPOS as readonly string[]).includes(esferaParam) ? esferaParam : '',
  );
  const [uf, setUf] = useState('');
  const [view, setView] = useState<'lista' | 'tabela'>('lista');
  const [sortBy, setSortBy] = useState<'valor' | 'objeto' | 'health'>('valor');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<RadarOpportunity | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RadarOpportunity | null>(null);
  const [removing, setRemoving] = useState<RadarOpportunity | null>(null);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const esferaApi = esfera && esfera !== 'Internacional' ? esfera : '';
  const radar = useQuery({
    queryKey: ['radar', search, esferaApi, uf],
    queryFn: () =>
      api.get<RadarOpportunity[]>(
        `/radar?search=${encodeURIComponent(search)}${esferaApi ? `&esfera=${esferaApi}` : ''}${uf ? `&uf=${uf}` : ''}`,
      ),
  });

  const items = (radar.data ?? []).filter((r) =>
    esfera === 'Internacional' ? grupoDe(r) === 'Internacional'
      : esfera ? grupoDe(r) === esfera
      : true,
  );
  const resumo = useMemo(() => {
    const soma = items.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0);
    const mensal = items.reduce((a, r) => a + radarParseBRL(r.valor_mensal), 0);
    const promovidas = items.filter((r) => r.opportunity_id).length;
    return { soma, mensal, promovidas };
  }, [items]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      if (sortBy === 'objeto') return tituloDe(a).localeCompare(tituloDe(b)) * dir;
      if (sortBy === 'health') return (healthScore(a) - healthScore(b)) * dir;
      return (radarParseBRL(a.valor_estimado_total_contrato) - radarParseBRL(b.valor_estimado_total_contrato)) * dir;
    });
  }, [items, sortBy, sortDir]);

  function sortHandler(col: typeof sortBy) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setError(null);
    setOpen(true);
  }

  function openEdit(r: RadarOpportunity) {
    setEditing(r);
    setForm({
      abrangencia: r.abrangencia, esfera: r.esfera, pais: r.pais,
      uf: r.uf === 'N/A' ? '' : r.uf, cidade: r.cidade === 'N/A' ? '' : r.cidade,
      objeto: r.objeto,
      orgao_responsavel: informado(r.orgao_responsavel) ? r.orgao_responsavel : '',
      valor_estimado_total_contrato: informado(r.valor_estimado_total_contrato) ? r.valor_estimado_total_contrato : '',
      periodo: informado(r.periodo) ? r.periodo : '',
      tempo_contrato: informado(r.tempo_contrato) ? r.tempo_contrato : '',
      responsavel_serpro: informado(r.responsavel_serpro) ? r.responsavel_serpro : '',
      hunter: informado(r.hunter) ? r.hunter : '',
      parceiro: informado(r.parceiro) ? r.parceiro : '',
      nome_parceiro: informado(r.nome_parceiro) ? r.nome_parceiro : '',
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    try {
      const body = { ...form, uf: form.uf || 'N/A', cidade: form.cidade || 'N/A' };
      if (editing) await api.patch(`/radar/${editing.id}`, body);
      else await api.post('/radar', body);
      setOpen(false);
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ['radar'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao salvar.');
    }
  }

  async function remove() {
    if (!removing) return;
    await api.delete(`/radar/${removing.id}`);
    setRemoving(null);
    setSelected(null);
    await queryClient.invalidateQueries({ queryKey: ['radar'] });
  }

  async function promote(r: RadarOpportunity) {
    setPageError(null);
    setPromoting(r.id);
    try {
      const opp = await api.post<Opportunity>(`/radar/${r.id}/promote`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['radar'] }),
        queryClient.invalidateQueries({ queryKey: ['kanban'] }),
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
      ]);
      navigate(`/oportunidades/${opp.id}`);
    } catch (e) {
      setPageError(e instanceof ApiError ? e.message : 'Falha ao promover ao Pipeline.');
    } finally {
      setPromoting(null);
    }
  }

  /** Exporta a visão filtrada/ordenada em CSV (padrão dos 17 campos oficiais). */
  function exportCsv() {
    const cols: Array<[string, (r: RadarOpportunity) => string]> = [
      ['numero', (r) => String(r.id)],
      ['abrangencia', (r) => r.abrangencia],
      ['esfera', (r) => r.esfera],
      ['pais', (r) => r.pais],
      ['uf', (r) => r.uf],
      ['cidade', (r) => r.cidade],
      ['icone_bandeira', (r) => r.icone_bandeira],
      ['objeto', (r) => r.objeto],
      ['orgao_responsavel', (r) => r.orgao_responsavel],
      ['valor_estimado_total_contrato', (r) => r.valor_estimado_total_contrato],
      ['periodo', (r) => r.periodo],
      ['tempo_contrato', (r) => r.tempo_contrato],
      ['valor_mensal', (r) => r.valor_mensal],
      ['responsavel_serpro', (r) => r.responsavel_serpro],
      ['hunter', (r) => r.hunter],
      ['parceiro', (r) => r.parceiro],
      ['nome_parceiro', (r) => r.nome_parceiro],
      ['status_pipeline', (r) => (r.pipeline ? `${r.pipeline.code} · ${r.pipeline.stage?.name ?? ''}` : 'Prospecção')],
    ];
    const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    // BOM + ponto-e-vírgula: abre certo no Excel pt-BR
    const csv = '﻿' +
      [cols.map(([h]) => h).join(';'), ...sorted.map((r) => cols.map(([, f]) => esc(f(r))).join(';'))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `faith-oportunidades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const isSerpro = form.hunter.trim().toUpperCase() === 'SERPRO';
  const mensalPreview = radarValorMensal(form.valor_estimado_total_contrato, form.tempo_contrato);

  return (
    <Box>
      {/* Cabeçalho */}
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
        <Typography variant="h4">Oportunidades</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_e, v) => v && setView(v)}
          aria-label="Modo de visualização"
        >
          <ToggleButton value="lista" aria-label="Lista agrupada">
            <ViewAgendaOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} /> Lista
          </ToggleButton>
          <ToggleButton value="tabela" aria-label="Tabela">
            <TableRowsIcon fontSize="small" sx={{ mr: 0.75 }} /> Tabela
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          variant="outlined"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={exportCsv}
          disabled={sorted.length === 0}
        >
          Exportar
        </Button>
        {canWrite && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nova oportunidade
          </Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {items.length} em prospecção · {brl0(resumo.soma)} estimados · {brl0(resumo.mensal)}/mês ·{' '}
        {resumo.promovidas} no Pipeline
      </Typography>

      {/* Filtros */}
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
        <TextField
          size="small"
          label="Buscar"
          placeholder="objeto, órgão, cidade, país…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <TextField select size="small" label="Esfera" value={esfera} onChange={(e) => setEsfera(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">Todas</MenuItem>
          {GRUPOS.map((es) => (
            <MenuItem key={es} value={es}>
              {es}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="UF" value={uf} onChange={(e) => setUf(e.target.value)} sx={{ minWidth: 96 }}>
          <MenuItem value="">Todas</MenuItem>
          {UFS.map((u) => (
            <MenuItem key={u} value={u}>
              {u}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {pageError && (
        <Alert severity="error" onClose={() => setPageError(null)} sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}
      {radar.isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Visão LISTA (agrupada por esfera) ── */}
      {view === 'lista' &&
        GRUPOS.filter((es) => items.some((r) => grupoDe(r) === es)).map((es) => {
          const group = items.filter((r) => grupoDe(r) === es);
          const groupTotal = group.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0);
          return (
            <Box key={es} sx={{ mb: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ mb: 1 }}>
                <Typography variant="overline">{es}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {group.length} · {brl0(groupTotal)}
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {group.map((r) => {
                  const na = nextAction(r);
                  return (
                    <Stack
                      key={r.id}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      onClick={() => setSelected(r)}
                      sx={{
                        px: 2,
                        py: 1.25,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2.5,
                        cursor: 'pointer',
                        boxShadow: DS.shadowXs,
                        '&:hover': { borderColor: DS.aco },
                      }}
                    >
                      <Bandeira item={r} />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>
                          {tituloDe(r)}
                        </Typography>
                        <Typography variant="body2" noWrap sx={{ display: 'block', color: 'text.primary' }}>
                          {subtituloDe(r)}
                          <Typography component="span" variant="caption" color="text.secondary">
                            {'  ·  '}
                            {localDe(r)}
                          </Typography>
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'block' } }}
                      >
                        {r.valor_estimado_total_contrato}
                      </Typography>
                      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Badge label={na.label} tone={na.tone} />
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          );
        })}

      {/* ── Visão TABELA (enterprise) ── */}
      {view === 'tabela' && (
        <TableContainer
          sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5, maxHeight: 620 }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel active={sortBy === 'objeto'} direction={sortDir} onClick={() => sortHandler('objeto')}>
                    Órgão / Oportunidade
                  </TableSortLabel>
                </TableCell>
                <TableCell>Esfera</TableCell>
                <TableCell>Local</TableCell>
                <TableCell align="right">
                  <TableSortLabel active={sortBy === 'valor'} direction={sortDir} onClick={() => sortHandler('valor')}>
                    Valor total
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Mensal</TableCell>
                <TableCell>Contrato</TableCell>
                <TableCell>Hunter</TableCell>
                <TableCell>Parceiro</TableCell>
                <TableCell>
                  <TableSortLabel active={sortBy === 'health'} direction={sortDir} onClick={() => sortHandler('health')}>
                    Health
                  </TableSortLabel>
                </TableCell>
                <TableCell>Próxima ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => {
                const na = nextAction(r);
                const hs = healthScore(r);
                const ht = healthTone(hs);
                return (
                  <TableRow key={r.id} hover onClick={() => setSelected(r)} sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Bandeira item={r} size={18} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {tituloDe(r)}
                          </Typography>
                          <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>
                            {subtituloDe(r)}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{r.esfera}</TableCell>
                    <TableCell>{localDe(r)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {r.valor_estimado_total_contrato}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {r.valor_mensal}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.tempo_contrato}</TableCell>
                    <TableCell>{r.hunter}</TableCell>
                    <TableCell>{r.parceiro === 'Sim' ? r.nome_parceiro : r.parceiro}</TableCell>
                    <TableCell>
                      <Chip size="small" label={`${hs}%`} sx={{ bgcolor: ht.bg, color: ht.color }} />
                    </TableCell>
                    <TableCell>
                      <Badge label={na.label} tone={na.tone} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!radar.isLoading && items.length === 0 && (
        <Alert severity="info">Nenhuma oportunidade encontrada com os filtros atuais.</Alert>
      )}

      {/* ── Drawer de detalhe ── */}
      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <Box sx={{ width: { xs: '100vw', sm: 460 }, p: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 0.5 }}>
              <Bandeira item={selected} size={26} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h5">{tituloDe(selected)}</Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.25 }}>
                  {subtituloDe(selected)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {localDe(selected)}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelected(null)} aria-label="Fechar">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ my: 2 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" variant="outlined" label={selected.esfera} />
              <Chip size="small" variant="outlined" label={selected.abrangencia} />
              {informado(selected.hunter) && <Chip size="small" variant="outlined" label={`Hunter: ${selected.hunter}`} />}
              <Badge label={nextAction(selected).label} tone={nextAction(selected).tone} />
            </Stack>

            {(() => {
              const hs = healthScore(selected);
              const ht = healthTone(hs);
              return (
                <Box sx={{ mb: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="overline">Health score (completude dos dados)</Typography>
                    <Typography variant="caption" sx={{ color: ht.color, fontWeight: 700 }}>
                      {hs}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={hs}
                    sx={{ height: 6, '& .MuiLinearProgress-bar': { bgcolor: ht.color } }}
                  />
                </Box>
              );
            })()}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                ['Valor total do contrato', selected.valor_estimado_total_contrato],
                ['Valor mensal (calculado)', selected.valor_mensal],
                ['Tempo de contrato', selected.tempo_contrato],
                ['Período', selected.periodo],
                ['País', selected.pais],
                ['Órgão responsável', selected.orgao_responsavel],
                ['Parceiro', selected.parceiro === 'Sim' ? selected.nome_parceiro : selected.parceiro],
                ['Responsável SERPRO', selected.responsavel_serpro],
              ].map(([label, value]) => (
                <Grid key={label} size={{ xs: 6 }}>
                  <Typography variant="overline" sx={{ display: 'block', lineHeight: 1.6 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {value}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            {canWrite && (
              <Stack spacing={1}>
                {selected.pipeline ? (
                  <Button
                    variant="contained"
                    component={Link}
                    to={`/oportunidades/${selected.pipeline.id}`}
                    startIcon={<RocketLaunchIcon />}
                  >
                    Abrir no Pipeline ({selected.pipeline.code})
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<RocketLaunchIcon />}
                    disabled={promoting === selected.id}
                    onClick={() => void promote(selected)}
                  >
                    {promoting === selected.id ? 'Promovendo…' : 'Promover ao Pipeline'}
                  </Button>
                )}
                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(selected)}>
                    Editar
                  </Button>
                  <Button fullWidth color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={() => setRemoving(selected)}>
                    Remover
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        )}
      </Drawer>

      {/* ── Formulário ── */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? `Editar oportunidade #${editing.id}` : 'Nova oportunidade'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField select fullWidth label="Abrangência" value={form.abrangencia} onChange={set('abrangencia')}>
                <MenuItem value="Nacional">Nacional</MenuItem>
                <MenuItem value="Internacional">Internacional</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField select fullWidth label="Esfera" value={form.esfera} onChange={set('esfera')}>
                {ESFERAS.map((es) => (
                  <MenuItem key={es} value={es}>
                    {es}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth
                label="País"
                value={form.abrangencia === 'Nacional' ? 'Brasil' : form.pais}
                onChange={set('pais')}
                disabled={form.abrangencia === 'Nacional'}
                helperText={form.abrangencia === 'Nacional' ? 'Nacional = Brasil (R4)' : undefined}
              />
            </Grid>
            <Grid size={{ xs: 3, md: 1.5 }}>
              <TextField
                select
                fullWidth
                label="UF"
                value={form.esfera === 'Federal' ? '' : form.uf}
                onChange={set('uf')}
                disabled={form.esfera === 'Federal'}
              >
                {UFS.map((u) => (
                  <MenuItem key={u} value={u}>
                    {u}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 9, md: 1.5 }}>
              <TextField
                fullWidth
                label="Cidade"
                value={form.esfera === 'Municipal' ? form.cidade : ''}
                onChange={set('cidade')}
                disabled={form.esfera !== 'Municipal'}
                required={form.esfera === 'Municipal'}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth required label="Objeto" value={form.objeto} onChange={set('objeto')} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Órgão responsável" value={form.orgao_responsavel} onChange={set('orgao_responsavel')} />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField
                fullWidth
                label="Valor total do contrato"
                placeholder="R$ 12.000.000,00"
                value={form.valor_estimado_total_contrato}
                onChange={set('valor_estimado_total_contrato')}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2.5 }}>
              <TextField fullWidth label="Período" placeholder="Ano" value={form.periodo} onChange={set('periodo')} />
            </Grid>
            <Grid size={{ xs: 6, md: 2.5 }}>
              <TextField
                fullWidth
                label="Tempo de contrato"
                placeholder="5 anos / 36 meses"
                value={form.tempo_contrato}
                onChange={set('tempo_contrato')}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField fullWidth label="Valor mensal (calculado)" value={mensalPreview} disabled helperText="R5: nunca informado à mão" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Responsável SERPRO" value={form.responsavel_serpro} onChange={set('responsavel_serpro')} />
            </Grid>
            <Grid size={{ xs: 4, md: 2.5 }}>
              <TextField select fullWidth label="Hunter" value={form.hunter} onChange={set('hunter')}>
                <MenuItem value="">Não informado</MenuItem>
                <MenuItem value="XPTO">XPTO</MenuItem>
                <MenuItem value="SERPRO">SERPRO</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 4, md: 2.5 }}>
              <TextField
                select
                fullWidth
                label="Parceiro"
                value={isSerpro ? 'N/A' : form.parceiro}
                onChange={set('parceiro')}
                disabled={isSerpro}
                helperText={isSerpro ? 'R6: SERPRO → N/A' : undefined}
              >
                <MenuItem value="">Não informado</MenuItem>
                <MenuItem value="Sim">Sim</MenuItem>
                <MenuItem value="Não">Não</MenuItem>
                {isSerpro && <MenuItem value="N/A">N/A</MenuItem>}
              </TextField>
            </Grid>
            <Grid size={{ xs: 4, md: 3 }}>
              <TextField
                fullWidth
                label="Nome do parceiro"
                value={isSerpro ? 'N/A' : form.nome_parceiro}
                onChange={set('nome_parceiro')}
                disabled={isSerpro}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.objeto.trim() || (form.esfera === 'Municipal' && !form.cidade.trim()) || (form.esfera !== 'Federal' && !form.uf)}
            onClick={() => void save()}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!removing} onClose={() => setRemoving(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remover oportunidade</DialogTitle>
        <DialogContent>
          <Typography>
            Remover <b>#{removing?.id} — {removing?.objeto}</b> do radar? A remoção fica registrada na auditoria.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => void remove()}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
