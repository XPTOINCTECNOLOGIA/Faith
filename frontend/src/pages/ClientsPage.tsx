import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import type { Client, Page } from '../lib/types';

const EMPTY = { name: '', orgao: '', cnpj: '', municipio: '', uf: '', contactName: '', contactEmail: '', contactPhone: '' };

export default function ClientsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);

  const clients = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.get<Page<Client>>(`/clients?pageSize=100&search=${encodeURIComponent(search)}`),
  });

  async function save() {
    setError(null);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      await api.post('/clients', body);
      setOpen(false);
      setForm({ ...EMPTY });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao salvar.');
    }
  }

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Clientes e órgãos
        </Typography>
        <TextField size="small" label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        {can('opp.client.manage') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Novo cliente
          </Button>
        )}
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>Órgão</TableCell>
            <TableCell>CNPJ</TableCell>
            <TableCell>Município/UF</TableCell>
            <TableCell>Contato</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(clients.data?.items ?? []).map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.orgao ?? '—'}</TableCell>
              <TableCell>{c.cnpj ?? '—'}</TableCell>
              <TableCell>
                {c.municipio ?? '—'}/{c.uf ?? '—'}
              </TableCell>
              <TableCell>
                {c.contactName ?? '—'} {c.contactEmail ? `· ${c.contactEmail}` : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Novo cliente / órgão</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth required label="Razão social" value={form.name} onChange={set('name')} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Órgão / entidade" value={form.orgao} onChange={set('orgao')} />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField fullWidth label="CNPJ" value={form.cnpj} onChange={set('cnpj')} />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField fullWidth label="Município" value={form.municipio} onChange={set('municipio')} />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField fullWidth label="UF" value={form.uf} onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))} slotProps={{ htmlInput: { maxLength: 2 } }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Contato principal" value={form.contactName} onChange={set('contactName')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth type="email" label="E-mail" value={form.contactEmail} onChange={set('contactEmail')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Telefone" value={form.contactPhone} onChange={set('contactPhone')} />
            </Grid>
          </Grid>
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
