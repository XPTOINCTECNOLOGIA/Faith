import { useState } from 'react';
import {
  Box,
  Card,
  Chip,
  LinearProgress,
  Link as MuiLink,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ACTION_LABEL, ENTITY_LABEL, actionLabel, actionTone, entityLabel } from '../lib/labels';
import type { Page } from '../lib/types';
import { STATE_SOFT } from '../theme';

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
  actorName: string | null;
  occurredAt: string;
}

const PAGE_SIZE = 25;

/** "há 3 h", "há 2 d", ou a data completa quando faz mais de uma semana. */
function quando(iso: string) {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias <= 7) return `há ${dias} d`;
  return d.toLocaleDateString('pt-BR');
}

const truncate = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function AuditPage() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0); // 0-based (TablePagination)

  const qs = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page + 1) });
  if (entity) qs.set('entity', entity);
  if (action) qs.set('action', action);

  const audit = useQuery({
    queryKey: ['audit', qs.toString()],
    queryFn: () => api.get<Page<AuditRow>>(`/audit?${qs.toString()}`),
  });

  const rows = audit.data?.items ?? [];

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 0.5 }}
      >
        <Typography variant="h4">Trilha de auditoria</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          select
          size="small"
          label="Entidade"
          value={entity}
          onChange={(e) => { setEntity(e.target.value); setPage(0); }}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {Object.entries(ENTITY_LABEL).map(([code, label]) => (
            <MenuItem key={code} value={code}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Ação"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(0); }}
          sx={{ minWidth: 210 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {Object.entries(ACTION_LABEL).map(([code, label]) => (
            <MenuItem key={code} value={code}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Tudo que acontece na plataforma fica registrado — quem fez, o quê e quando.
      </Typography>

      <Card>
        {audit.isLoading && <LinearProgress />}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Quando</TableCell>
                <TableCell>Evento</TableCell>
                <TableCell>Ação</TableCell>
                <TableCell>Alteração</TableCell>
                <TableCell align="right">Oportunidade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const tone = STATE_SOFT[actionTone(row.action)];
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title={new Date(row.occurredAt).toLocaleString('pt-BR')}>
                        <span>{quando(row.occurredAt)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <b>{row.actorName ?? 'Sistema'}</b> {actionLabel(row.action)}{' '}
                      {entityLabel(row.entity)} <span style={{ opacity: 0.6 }}>#{row.entityId}</span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={actionLabel(row.action).split(' ')[0]}
                        sx={{ bgcolor: tone.bg, color: tone.color }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      {row.field && (
                        <Typography variant="caption" color="text.secondary" component="span">
                          {row.field}:{' '}
                        </Typography>
                      )}
                      {row.oldValue || row.newValue ? (
                        <Tooltip title={`${row.oldValue ?? '∅'} → ${row.newValue ?? '∅'}`}>
                          <span>
                            {truncate(row.oldValue ?? '∅', 26)} → {truncate(row.newValue ?? '∅', 26)}
                          </span>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {row.opportunityId ? (
                        <MuiLink component={Link} to={`/oportunidades/${row.opportunityId}`} underline="hover">
                          #{row.opportunityId}
                        </MuiLink>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!audit.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Stack alignItems="center" spacing={1} sx={{ py: 5, color: 'text.secondary' }}>
                      <HistoryEduIcon />
                      <Typography variant="body2">
                        Nenhum evento encontrado com os filtros atuais.
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={audit.data?.total ?? 0}
          page={page}
          onPageChange={(_e, p) => setPage(p)}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Card>
    </Box>
  );
}
