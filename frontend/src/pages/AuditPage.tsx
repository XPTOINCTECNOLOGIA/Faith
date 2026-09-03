import { useState } from 'react';
import {
  Box,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Page } from '../lib/types';

interface AuditRow {
  id: number;
  entity: string;
  entityId: number;
  opportunityId: number | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  actorId: number;
  occurredAt: string;
}

export default function AuditPage() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  const qs = new URLSearchParams({ pageSize: '50' });
  if (entity) qs.set('entity', entity);
  if (action) qs.set('action', action);

  const audit = useQuery({
    queryKey: ['audit', qs.toString()],
    queryFn: () => api.get<Page<AuditRow>>(`/audit?${qs.toString()}`),
  });

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Trilha de auditoria
        </Typography>
        <TextField size="small" label="Entidade" value={entity} onChange={(e) => setEntity(e.target.value)} />
        <TextField size="small" label="Ação" value={action} onChange={(e) => setAction(e.target.value)} />
      </Stack>
      {audit.isLoading && <LinearProgress />}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Quando</TableCell>
            <TableCell>Ator</TableCell>
            <TableCell>Entidade</TableCell>
            <TableCell>Ação</TableCell>
            <TableCell>Campo</TableCell>
            <TableCell>Anterior → Novo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(audit.data?.items ?? []).map((row) => (
            <TableRow key={row.id}>
              <TableCell>{new Date(row.occurredAt).toLocaleString('pt-BR')}</TableCell>
              <TableCell>#{row.actorId}</TableCell>
              <TableCell>
                {row.entity} #{row.entityId}
              </TableCell>
              <TableCell>{row.action}</TableCell>
              <TableCell>{row.field ?? '—'}</TableCell>
              <TableCell>
                {row.oldValue || row.newValue ? `${row.oldValue ?? '∅'} → ${row.newValue ?? '∅'}` : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
