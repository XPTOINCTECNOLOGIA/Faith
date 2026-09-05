import { useState } from 'react';
import {
  Box,
  Button,
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
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
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
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [oppId, setOppId] = useState('');
  const [page, setPage] = useState(0); // 0-based (TablePagination)
  const [exporting, setExporting] = useState(false);

  function buildQs(pageSize: number, pageNum: number) {
    const q = new URLSearchParams({ pageSize: String(pageSize), page: String(pageNum) });
    if (entity) q.set('entity', entity);
    if (action) q.set('action', action);
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (oppId.trim() && Number(oppId) > 0) q.set('opportunityId', String(Number(oppId)));
    return q;
  }
  const qs = buildQs(PAGE_SIZE, page + 1);

  const audit = useQuery({
    queryKey: ['audit', qs.toString()],
    queryFn: () => api.get<Page<AuditRow>>(`/audit?${qs.toString()}`),
  });

  const rows = audit.data?.items ?? [];
  const resetPage = () => setPage(0);

  /** Exporta os eventos com os filtros atuais (até 2000) em CSV pt-BR. */
  async function exportCsv() {
    setExporting(true);
    try {
      const all = await api.get<Page<AuditRow>>(`/audit?${buildQs(2000, 1).toString()}`);
      const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
      const head = 'quando;ator;entidade;id;acao;campo;anterior;novo;oportunidade';
      const lines = (all.items ?? []).map((r) =>
        [
          new Date(r.occurredAt).toLocaleString('pt-BR'),
          esc(r.actorName ?? 'Sistema'),
          entityLabel(r.entity), String(r.entityId), actionLabel(r.action),
          r.field ?? '', esc(r.oldValue ?? ''), esc(r.newValue ?? ''),
          r.opportunityId ? String(r.opportunityId) : '',
        ].join(';'),
      );
      const url = URL.createObjectURL(
        new Blob(['﻿' + [head, ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `faith-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

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
          onChange={(e) => { setEntity(e.target.value); resetPage(); }}
          sx={{ minWidth: 180 }}
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
          onChange={(e) => { setAction(e.target.value); resetPage(); }}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {Object.entries(ACTION_LABEL).map(([code, label]) => (
            <MenuItem key={code} value={code}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="date"
          label="De"
          value={from}
          onChange={(e) => { setFrom(e.target.value); resetPage(); }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          type="date"
          label="Até"
          value={to}
          onChange={(e) => { setTo(e.target.value); resetPage(); }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          type="number"
          label="Oportunidade #"
          value={oppId}
          onChange={(e) => { setOppId(e.target.value); resetPage(); }}
          sx={{ width: 140 }}
          inputProps={{ min: 1 }}
        />
        <Button
          variant="outlined"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={() => void exportCsv()}
          disabled={exporting || (audit.data?.total ?? 0) === 0}
        >
          Exportar
        </Button>
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
