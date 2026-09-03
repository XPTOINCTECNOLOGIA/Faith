import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { FOCAL_PAPEL_LABEL, UFS, type FocalPoint } from '../lib/types';

interface CoverageDraft {
  uf: string;
  municipio: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  papel: string;
  regiao: string;
  coverage: CoverageDraft[];
}

const EMPTY: FormState = { name: '', email: '', phone: '', papel: 'outro', regiao: '', coverage: [] };

export default function FocalPointsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const manage = can('opp.focal.manage');
  const [search, setSearch] = useState('');
  const [ufFilter, setUfFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FocalPoint | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);

  const focal = useQuery({
    queryKey: ['focal-points', search, ufFilter, showInactive],
    queryFn: () =>
      api.get<FocalPoint[]>(
        `/focal-points?search=${encodeURIComponent(search)}${ufFilter ? `&uf=${ufFilter}` : ''}${showInactive ? '&all=true' : ''}`,
      ),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, coverage: [] });
    setError(null);
    setOpen(true);
  }

  function openEdit(fp: FocalPoint) {
    setEditing(fp);
    setForm({
      name: fp.name,
      email: fp.email ?? '',
      phone: fp.phone ?? '',
      papel: fp.papel,
      regiao: fp.regiao != null ? String(fp.regiao) : '',
      coverage: fp.coverage.map((c) => ({ uf: c.uf, municipio: c.municipio ?? '' })),
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        email: form.email,
        phone: form.phone,
        papel: form.papel,
        regiao: form.regiao ? Number(form.regiao) : null,
        coverage: form.coverage
          .filter((c) => c.uf)
          .map((c) => ({ uf: c.uf, municipio: c.municipio.trim() || null })),
      };
      if (editing) await api.patch(`/focal-points/${editing.id}`, body);
      else await api.post('/focal-points', body);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['focal-points'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao salvar.');
    }
  }

  async function deactivate(fp: FocalPoint) {
    await api.delete(`/focal-points/${fp.id}`);
    await queryClient.invalidateQueries({ queryKey: ['focal-points'] });
  }

  async function reactivate(fp: FocalPoint) {
    await api.patch(`/focal-points/${fp.id}`, { active: true });
    await queryClient.invalidateQueries({ queryKey: ['focal-points'] });
  }

  const setCoverage = (index: number, patch: Partial<CoverageDraft>) =>
    setForm((f) => ({
      ...f,
      coverage: f.coverage.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Pontos Focais SERPRO
        </Typography>
        <TextField
          select
          size="small"
          label="UF"
          value={ufFilter}
          onChange={(e) => setUfFilter(e.target.value)}
          sx={{ minWidth: 90 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {UFS.map((uf) => (
            <MenuItem key={uf} value={uf}>
              {uf}
            </MenuItem>
          ))}
        </TextField>
        <TextField size="small" label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        {manage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Novo ponto focal
          </Button>
        )}
      </Stack>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
        Responsáveis do SERPRO por estados e municípios. Ao criar uma oportunidade, quem cobre a
        UF do cliente é vinculado automaticamente como responsável (ajustável na oportunidade).
      </Typography>

      {manage && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Switch size="small" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          <Typography variant="body2" color="text.secondary">
            Mostrar inativos
          </Typography>
        </Stack>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>Papel</TableCell>
            <TableCell>Contato</TableCell>
            <TableCell>Cobertura</TableCell>
            {manage && <TableCell align="right">Ações</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {(focal.data ?? []).map((fp) => (
            <TableRow key={fp.id} sx={fp.active ? undefined : { opacity: 0.5 }}>
              <TableCell>
                <Typography fontWeight={600}>{fp.name}</Typography>
                {!fp.active && <Chip size="small" label="inativo" variant="outlined" />}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={FOCAL_PAPEL_LABEL[fp.papel] ?? fp.papel}
                  variant="outlined"
                  color={fp.papel === 'responsavel_departamento' ? 'info' : fp.papel === 'divisao_publica' ? 'success' : 'default'}
                />
                {fp.regiao != null && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Região {fp.regiao}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2">{fp.email ?? '—'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {fp.phone ?? ''}
                </Typography>
              </TableCell>
              <TableCell sx={{ maxWidth: 360 }}>
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                  {fp.coverage.map((c) => (
                    <Chip
                      key={c.id}
                      size="small"
                      label={c.municipio ? `${c.uf} · ${c.municipio}` : c.uf}
                      sx={{ bgcolor: '#DDEFF4', color: '#14556B' }}
                    />
                  ))}
                  {fp.coverage.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Sem cobertura cadastrada
                    </Typography>
                  )}
                </Stack>
              </TableCell>
              {manage && (
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openEdit(fp)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {fp.active ? (
                    <Tooltip title="Desativar">
                      <IconButton size="small" onClick={() => void deactivate(fp)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Button size="small" onClick={() => void reactivate(fp)}>
                      Reativar
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!focal.isLoading && (focal.data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={manage ? 5 : 4}>
                <Typography color="text.secondary">Nenhum ponto focal encontrado.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? `Editar ponto focal — ${editing.name}` : 'Novo ponto focal SERPRO'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Nome"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                label="Papel"
                value={form.papel}
                onChange={(e) => setForm((f) => ({ ...f, papel: e.target.value }))}
              >
                {Object.entries(FOCAL_PAPEL_LABEL).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                type="email"
                label="E-mail"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 8, md: 4 }}>
              <TextField
                fullWidth
                label="Fone/Whats"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 4, md: 3 }}>
              <TextField
                fullWidth
                label="Região"
                type="number"
                value={form.regiao}
                onChange={(e) => setForm((f) => ({ ...f, regiao: e.target.value }))}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
            Cobertura (UF e, opcionalmente, município — em branco cobre o estado todo)
          </Typography>
          <Stack spacing={1}>
            {form.coverage.map((c, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField
                  select
                  size="small"
                  label="UF"
                  value={c.uf}
                  onChange={(e) => setCoverage(i, { uf: e.target.value })}
                  sx={{ minWidth: 90 }}
                >
                  {UFS.map((uf) => (
                    <MenuItem key={uf} value={uf}>
                      {uf}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Município (opcional)"
                  value={c.municipio}
                  onChange={(e) => setCoverage(i, { municipio: e.target.value })}
                  sx={{ flexGrow: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={() => setForm((f) => ({ ...f, coverage: f.coverage.filter((_c, j) => j !== i) }))}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Box>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setForm((f) => ({ ...f, coverage: [...f.coverage, { uf: '', municipio: '' }] }))}
              >
                Adicionar UF/município
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!form.name.trim()} onClick={() => void save()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
