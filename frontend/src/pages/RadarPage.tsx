import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { UFS, radarParseBRL, radarValorMensal, type Opportunity, type RadarOpportunity } from '../lib/types';

interface FormState {
  abrangencia: string;
  esfera: string;
  pais: string;
  uf: string;
  cidade: string;
  objeto: string;
  orgao_responsavel: string;
  valor_estimado_total_contrato: string;
  periodo: string;
  tempo_contrato: string;
  responsavel_serpro: string;
  hunter: string;
  parceiro: string;
  nome_parceiro: string;
}

const EMPTY: FormState = {
  abrangencia: 'Nacional', esfera: 'Federal', pais: 'Brasil', uf: '', cidade: '',
  objeto: '', orgao_responsavel: '', valor_estimado_total_contrato: '', periodo: '',
  tempo_contrato: '', responsavel_serpro: '', hunter: '', parceiro: '', nome_parceiro: '',
};

const ESFERAS = ['Federal', 'Estadual', 'Municipal'] as const;

const brl0 = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function Bandeira({ item }: { item: RadarOpportunity }) {
  const isEmoji = /\p{Regional_Indicator}/u.test(item.icone_bandeira);
  if (isEmoji) {
    return (
      <Tooltip title={item.pais}>
        <Typography component="span" sx={{ fontSize: 24, lineHeight: 1 }}>
          {item.icone_bandeira}
        </Typography>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={item.icone_bandeira}>
      <Chip
        size="small"
        label={item.esfera === 'Estadual' ? item.uf : item.cidade}
        sx={{ bgcolor: 'rgba(96,207,226,0.12)', color: 'primary.main', fontWeight: 700, minWidth: 44 }}
      />
    </Tooltip>
  );
}

function localDe(r: RadarOpportunity): string {
  if (r.esfera === 'Federal') return r.pais;
  if (r.esfera === 'Estadual') return `${r.uf} · ${r.pais}`;
  return `${r.cidade}/${r.uf}`;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 6, sm: 4, md: 3 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Grid>
  );
}

export default function RadarPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canWrite = can('opp.create') || can('opp.update');
  const [search, setSearch] = useState('');
  const [esfera, setEsfera] = useState('');
  const [uf, setUf] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RadarOpportunity | null>(null);
  const [removing, setRemoving] = useState<RadarOpportunity | null>(null);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const radar = useQuery({
    queryKey: ['radar', search, esfera, uf],
    queryFn: () =>
      api.get<RadarOpportunity[]>(
        `/radar?search=${encodeURIComponent(search)}${esfera ? `&esfera=${esfera}` : ''}${uf ? `&uf=${uf}` : ''}`,
      ),
  });

  const items = radar.data ?? [];
  const resumo = useMemo(() => {
    const soma = items.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0);
    const mensal = items.reduce((a, r) => a + radarParseBRL(r.valor_mensal), 0);
    const promovidas = items.filter((r) => r.opportunity_id).length;
    return { soma, mensal, promovidas };
  }, [items]);

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
      orgao_responsavel: r.orgao_responsavel === 'Não informado' ? '' : r.orgao_responsavel,
      valor_estimado_total_contrato: r.valor_estimado_total_contrato === 'Não informado' ? '' : r.valor_estimado_total_contrato,
      periodo: r.periodo === 'Não informado' ? '' : r.periodo,
      tempo_contrato: r.tempo_contrato === 'Não informado' ? '' : r.tempo_contrato,
      responsavel_serpro: r.responsavel_serpro === 'Não informado' ? '' : r.responsavel_serpro,
      hunter: r.hunter === 'Não informado' ? '' : r.hunter,
      parceiro: r.parceiro === 'Não informado' || r.parceiro === 'N/A' ? '' : r.parceiro,
      nome_parceiro: r.nome_parceiro === 'Não informado' || r.nome_parceiro === 'N/A' ? '' : r.nome_parceiro,
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
      await queryClient.invalidateQueries({ queryKey: ['radar'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao salvar.');
    }
  }

  async function remove() {
    if (!removing) return;
    await api.delete(`/radar/${removing.id}`);
    setRemoving(null);
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
        queryClient.invalidateQueries({ queryKey: ['open-count'] }),
      ]);
      navigate(`/oportunidades/${opp.id}`);
    } catch (e) {
      setPageError(e instanceof ApiError ? e.message : 'Falha ao promover ao Pipeline.');
    } finally {
      setPromoting(null);
    }
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const isSerpro = form.hunter.trim().toUpperCase() === 'SERPRO';
  const mensalPreview = radarValorMensal(form.valor_estimado_total_contrato, form.tempo_contrato);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Radar de Oportunidades
        </Typography>
        <TextField select size="small" label="Esfera" value={esfera} onChange={(e) => setEsfera(e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">Todas</MenuItem>
          {ESFERAS.map((es) => (
            <MenuItem key={es} value={es}>
              {es}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="UF" value={uf} onChange={(e) => setUf(e.target.value)} sx={{ minWidth: 90 }}>
          <MenuItem value="">Todas</MenuItem>
          {UFS.map((u) => (
            <MenuItem key={u} value={u}>
              {u}
            </MenuItem>
          ))}
        </TextField>
        <TextField size="small" label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        {canWrite && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nova
          </Button>
        )}
      </Stack>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
        {items.length} oportunidade{items.length === 1 ? '' : 's'} em prospecção · {brl0(resumo.soma)} estimados ·{' '}
        {brl0(resumo.mensal)}/mês · {resumo.promovidas} já no Pipeline
      </Typography>

      {pageError && (
        <Alert severity="error" onClose={() => setPageError(null)} sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      {ESFERAS.filter((es) => items.some((r) => r.esfera === es)).map((es) => {
        const group = items.filter((r) => r.esfera === es);
        const groupTotal = group.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0);
        return (
          <Box key={es} sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '.04em' }}>
                {es.toUpperCase()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {group.length} oportunidade{group.length === 1 ? '' : 's'} · {brl0(groupTotal)}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              {group.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <Box
                    key={r.id}
                    sx={{
                      border: '1px solid',
                      borderColor: isOpen ? 'primary.dark' : 'divider',
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      overflow: 'hidden',
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      sx={{ px: 2, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(96,207,226,0.05)' } }}
                    >
                      <Bandeira item={r} />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>
                          {r.objeto}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {localDe(r)}
                          {r.orgao_responsavel !== 'Não informado' ? ` · ${r.orgao_responsavel}` : ''}
                        </Typography>
                      </Box>
                      {r.pipeline ? (
                        <Tooltip title={`No Pipeline — etapa ${r.pipeline.stage?.name ?? ''}`}>
                          <Chip
                            size="small"
                            component={Link}
                            to={`/oportunidades/${r.pipeline.id}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            clickable
                            label={r.pipeline.code}
                            sx={{
                              bgcolor: r.pipeline.stage?.color ?? 'rgba(16,185,129,0.16)',
                              color: '#fff',
                              fontWeight: 700,
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
                        >
                          {r.valor_estimado_total_contrato}
                        </Typography>
                      )}
                      <IconButton size="small" sx={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '.2s' }}>
                        <ExpandMoreIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    <Collapse in={isOpen} unmountOnExit>
                      <Box sx={{ px: 2, pb: 2, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                        <Grid container spacing={2} sx={{ mt: 0 }}>
                          <DetailField label="Valor total do contrato" value={r.valor_estimado_total_contrato} />
                          <DetailField label="Valor mensal (calculado)" value={r.valor_mensal} />
                          <DetailField label="Tempo de contrato" value={r.tempo_contrato} />
                          <DetailField label="Período" value={r.periodo} />
                          <DetailField label="Abrangência" value={r.abrangencia} />
                          <DetailField label="País" value={r.pais} />
                          <DetailField label="Hunter" value={r.hunter} />
                          <DetailField
                            label="Parceiro"
                            value={r.parceiro === 'Sim' ? r.nome_parceiro : r.parceiro}
                          />
                          <DetailField label="Responsável SERPRO" value={r.responsavel_serpro} />
                          <DetailField label="Órgão responsável" value={r.orgao_responsavel} />
                        </Grid>
                        {canWrite && (
                          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                            {r.pipeline ? (
                              <Button
                                size="small"
                                variant="contained"
                                component={Link}
                                to={`/oportunidades/${r.pipeline.id}`}
                                startIcon={<RocketLaunchIcon />}
                              >
                                Abrir no Pipeline ({r.pipeline.code})
                              </Button>
                            ) : (
                              <Tooltip title="Cria a oportunidade na esteira de governança, reaproveitando/criando o cliente (órgão) e o parceiro">
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<RocketLaunchIcon />}
                                  disabled={promoting === r.id}
                                  onClick={() => void promote(r)}
                                >
                                  {promoting === r.id ? 'Promovendo…' : 'Promover ao Pipeline'}
                                </Button>
                              </Tooltip>
                            )}
                            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(r)}>
                              Editar
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteOutlineIcon />}
                              onClick={() => setRemoving(r)}
                            >
                              Remover
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        );
      })}

      {!radar.isLoading && items.length === 0 && (
        <Alert severity="info">Nenhuma oportunidade encontrada com os filtros atuais.</Alert>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? `Editar oportunidade #${editing.id}` : 'Nova oportunidade no radar'}</DialogTitle>
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
