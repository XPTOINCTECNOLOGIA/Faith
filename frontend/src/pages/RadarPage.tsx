import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  IconButton,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { UFS, radarParseBRL, radarValorMensal, type RadarOpportunity } from '../lib/types';

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

function Bandeira({ item }: { item: RadarOpportunity }) {
  const isEmoji = /\p{Regional_Indicator}/u.test(item.icone_bandeira);
  if (isEmoji) {
    return (
      <Tooltip title={item.pais}>
        <Typography component="span" sx={{ fontSize: 26, lineHeight: 1 }}>
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
        sx={{ bgcolor: 'rgba(96,207,226,0.12)', color: 'primary.main', fontWeight: 700 }}
      />
    </Tooltip>
  );
}

export default function RadarPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = can('opp.create') || can('opp.update');
  const [search, setSearch] = useState('');
  const [esfera, setEsfera] = useState('');
  const [uf, setUf] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RadarOpportunity | null>(null);
  const [removing, setRemoving] = useState<RadarOpportunity | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);

  const radar = useQuery({
    queryKey: ['radar', search, esfera, uf],
    queryFn: () =>
      api.get<RadarOpportunity[]>(
        `/radar?search=${encodeURIComponent(search)}${esfera ? `&esfera=${esfera}` : ''}${uf ? `&uf=${uf}` : ''}`,
      ),
  });

  const items = radar.data ?? [];
  const totals = useMemo(() => {
    const soma = items.reduce((a, r) => a + radarParseBRL(r.valor_estimado_total_contrato), 0);
    const mensal = items.reduce((a, r) => a + radarParseBRL(r.valor_mensal), 0);
    return { soma, mensal, semValor: items.filter((r) => r.valor_estimado_total_contrato === 'Não informado').length };
  }, [items]);

  const brl = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

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
          <MenuItem value="Federal">Federal</MenuItem>
          <MenuItem value="Estadual">Estadual</MenuItem>
          <MenuItem value="Municipal">Municipal</MenuItem>
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
            Nova oportunidade
          </Button>
        )}
      </Stack>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
        Base padronizada de prospecção comercial — as regras de modelagem (valor mensal calculado,
        bandeiras, N/A por esfera, hunter SERPRO) são aplicadas automaticamente pelo banco.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'Oportunidades no radar', value: String(items.length) },
          { label: 'Valor total estimado', value: brl(totals.soma) },
          { label: 'Receita mensal estimada', value: brl(totals.mensal) },
          { label: 'Sem valor informado', value: String(totals.semValor) },
        ].map((k) => (
          <Grid key={k.label} size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">
                  {k.label}
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {k.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={56}>#</TableCell>
              <TableCell>Oportunidade</TableCell>
              <TableCell>Esfera / Local</TableCell>
              <TableCell align="right">Valor total</TableCell>
              <TableCell align="right">Valor mensal</TableCell>
              <TableCell>Contrato</TableCell>
              <TableCell>Hunter</TableCell>
              <TableCell>Parceiro</TableCell>
              {canWrite && <TableCell align="right">Ações</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.id}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Bandeira item={r} />
                    <Box>
                      <Typography fontWeight={600}>{r.objeto}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.orgao_responsavel}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{r.esfera}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.esfera === 'Federal'
                      ? r.pais
                      : r.esfera === 'Estadual'
                        ? `${r.uf} · ${r.pais}`
                        : `${r.cidade}/${r.uf}`}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {r.valor_estimado_total_contrato}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {r.valor_mensal}
                </TableCell>
                <TableCell>{r.tempo_contrato}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={r.hunter}
                    variant="outlined"
                    color={r.hunter === 'XPTO' ? 'info' : r.hunter === 'SERPRO' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {r.parceiro === 'Sim' ? (
                    <Typography variant="body2">{r.nome_parceiro}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {r.parceiro}
                    </Typography>
                  )}
                </TableCell>
                {canWrite && (
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(r)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover">
                      <IconButton size="small" onClick={() => setRemoving(r)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!radar.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={canWrite ? 9 : 8}>
                  <Typography color="text.secondary">Nenhuma oportunidade encontrada.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

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
                <MenuItem value="Federal">Federal</MenuItem>
                <MenuItem value="Estadual">Estadual</MenuItem>
                <MenuItem value="Municipal">Municipal</MenuItem>
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
              <TextField
                fullWidth
                label="Valor mensal (calculado)"
                value={mensalPreview}
                disabled
                helperText="R5: nunca informado à mão"
              />
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
