import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import type { Page, Partner } from '../lib/types';

export default function PartnersPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [error, setError] = useState<string | null>(null);

  const partners = useQuery({
    queryKey: ['partners'],
    queryFn: () => api.get<Page<Partner>>('/partners?pageSize=100'),
  });

  async function save() {
    setError(null);
    try {
      await api.post('/partners', { name, ...(cnpj ? { cnpj } : {}) });
      setOpen(false);
      setName('');
      setCnpj('');
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao salvar.');
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Parceiros
        </Typography>
        {can('opp.partner.manage') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Novo parceiro
          </Button>
        )}
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>CNPJ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(partners.data?.items ?? []).map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.cnpj ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo parceiro</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth required label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField fullWidth label="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!name.trim()} onClick={() => void save()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
