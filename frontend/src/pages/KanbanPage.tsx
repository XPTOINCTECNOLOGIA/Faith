import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { idleDias, idleNivel, type LastActivityMap } from '../lib/activity';
import { formatBRL, LEAD_SOURCE_LABEL, type KanbanColumn } from '../lib/types';
import { SOURCE_HEX, STATE_SOFT } from '../theme';

const SOURCE_COLOR: Record<string, 'primary' | 'warning' | 'success'> = {
  xpto: 'primary',
  parceiro: 'warning',
  serpro: 'success',
};

interface BlockedInfo {
  message: string;
  pendingItems: Array<{ checklistItemId: number; name: string; status: string }>;
  opportunityId: number;
}

interface DragInfo {
  id: number;
  fromIndex: number;
  label: string;
}

export default function KanbanPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  // Vindo do Dashboard (Pipeline por estágio): coluna em foco + rolagem até ela
  const etapaFoco = params.get('etapa') ? Number(params.get('etapa')) : null;
  const [blocked, setBlocked] = useState<BlockedInfo | null>(null);
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [regress, setRegress] = useState<{ id: number; label: string; toStageId: number; toName: string } | null>(null);
  const [regressReason, setRegressReason] = useState('');

  const kanban = useQuery({
    queryKey: ['kanban'],
    queryFn: () => api.get<KanbanColumn[]>('/opportunities/kanban'),
    refetchInterval: 30_000,
  });
  const lastActivity = useQuery({
    queryKey: ['activity-last'],
    queryFn: () => api.get<LastActivityMap>('/activity/last'),
    staleTime: 60_000,
  });

  const advance = useMutation({
    mutationFn: ({ id, toStageId }: { id: number; toStageId: number }) =>
      api.post(`/opportunities/${id}/transition`, { toStageId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban'] }),
    onError: (error, vars) => {
      if (error instanceof ApiError && error.statusCode === 409) {
        const details = error.details as { pendingItems?: BlockedInfo['pendingItems'] } | undefined;
        setBlocked({
          message: error.message,
          pendingItems: details?.pendingItems ?? [],
          opportunityId: vars.id,
        });
      }
    },
  });

  if (kanban.isLoading) return <LinearProgress />;
  if (kanban.error) return <Alert severity="error">Falha ao carregar o pipeline.</Alert>;

  const columns = kanban.data ?? [];
  const canMove = can('opp.move_stage');
  const isAdmin = can('opp.admin');

  /** Solta o card na coluna alvo: avanço direto (RN-001/002 no banco) ou regressão RN-025. */
  function handleDrop(targetIndex: number) {
    setDragOver(null);
    if (!drag) return;
    const d = drag;
    setDrag(null);
    setPageError(null);
    const target = columns[targetIndex];
    if (!target || targetIndex === d.fromIndex) return;
    if (target.isTerminal) {
      setPageError('Encerramento não é feito por arraste: abra a oportunidade e use "Encerrar" (exige justificativa — RN-008).');
      return;
    }
    if (targetIndex > d.fromIndex) {
      advance.mutate({ id: d.id, toStageId: target.stageId });
      return;
    }
    // regressão: só admin, com justificativa (RN-025)
    if (!isAdmin) {
      setPageError('Voltar etapa é uma ação administrativa (RN-025) — requer opp.admin.');
      return;
    }
    setRegressReason('');
    setRegress({ id: d.id, label: d.label, toStageId: target.stageId, toName: target.name });
  }

  async function confirmRegress() {
    if (!regress) return;
    setPageError(null);
    try {
      await api.post(`/opportunities/${regress.id}/transition`, {
        toStageId: regress.toStageId,
        justification: `[Regressão administrativa — RN-025] ${regressReason.trim()}`,
      });
      setRegress(null);
      await queryClient.invalidateQueries({ queryKey: ['kanban'] });
    } catch (e) {
      setPageError(e instanceof ApiError ? e.message : 'Falha ao voltar etapa.');
      setRegress(null);
    }
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
        <Typography variant="h4">Pipeline</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('opp.create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/oportunidades/nova')}>
            Nova oportunidade
          </Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Esteira de governança — nenhuma oportunidade avança sem os documentos obrigatórios aprovados
        {canMove ? ' · arraste um card para mudar de etapa' : ''}
      </Typography>
      {pageError && (
        <Alert severity="warning" onClose={() => setPageError(null)} sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}
      {etapaFoco != null && (
        <Chip
          label={`Em foco: ${columns.find((c) => c.stageId === etapaFoco)?.name ?? `etapa #${etapaFoco}`}`}
          onDelete={() => setParams({}, { replace: true })}
          sx={{ mb: 2, bgcolor: '#DDEFF4', color: '#2B4469', fontWeight: 600 }}
        />
      )}

      <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
        {columns.map((col, index) => {
          const next = columns[index + 1];
          const isTarget = dragOver === index && drag != null && index !== drag.fromIndex;
          const emFoco = etapaFoco === col.stageId;
          return (
            <Box
              key={col.stageId}
              ref={emFoco ? (el: HTMLDivElement | null) => el?.scrollIntoView({ inline: 'center', block: 'nearest' }) : undefined}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                setDragOver(index);
              }}
              onDragLeave={() => setDragOver((cur) => (cur === index ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(index);
              }}
              sx={{
                minWidth: 276,
                maxWidth: 276,
                flexShrink: 0,
                bgcolor: isTarget ? '#DDEFF4' : emFoco ? '#EAF1F7' : '#f0f2f5',
                outline: isTarget ? '2px dashed #60CFE2' : emFoco ? '2px solid #60CFE2' : 'none',
                outlineOffset: -2,
                transition: 'background-color .12s',
                borderRadius: 2.5,
                p: 1,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col.color ?? 'divider' }} />
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }} noWrap>
                  {col.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {col.count} · {formatBRL(col.totalValue)}
                </Typography>
              </Stack>

              <Stack spacing={1}>
                {col.cards.map((card) => {
                  const dias = col.isTerminal ? null : idleDias(lastActivity.data?.[String(card.id)]);
                  const nivel = idleNivel(dias);
                  return (
                  <Card
                    key={card.id}
                    draggable={canMove}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      setDrag({ id: card.id, fromIndex: index, label: card.clientName ?? card.code });
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setDragOver(null);
                    }}
                    sx={{
                      borderLeft: '3px solid',
                      borderLeftColor: SOURCE_HEX[card.leadSource] ?? 'divider',
                      cursor: canMove ? 'grab' : undefined,
                      opacity: drag?.id === card.id ? 0.45 : 1,
                    }}
                  >
                    <CardActionArea component={Link} to={`/oportunidades/${card.id}`} sx={{ p: 1.5 }}>
                      <Stack spacing={0.75}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ minWidth: 0 }}>
                            {card.clientName ?? '—'}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                            {nivel !== 'ok' && (
                              <Tooltip title={`Sem atividade registrada há ${dias} dias`}>
                                <Chip
                                  size="small"
                                  label={`parado ${dias} d`}
                                  sx={{
                                    height: 20, fontSize: 11,
                                    bgcolor: nivel === 'crit' ? STATE_SOFT.error.bg : STATE_SOFT.warning.bg,
                                    color: nivel === 'crit' ? STATE_SOFT.error.color : STATE_SOFT.warning.color,
                                  }}
                                />
                              </Tooltip>
                            )}
                            {card.overdue && (
                              <Tooltip title="Prazo de fechamento vencido">
                                <WarningAmberIcon color="warning" fontSize="small" />
                              </Tooltip>
                            )}
                          </Stack>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {card.code}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {formatBRL(card.valorEstimado)}
                          </Typography>
                          {card.probabilidade != null && (
                            <Typography variant="caption" color="text.secondary">
                              {card.probabilidade}%
                            </Typography>
                          )}
                        </Stack>
                        <Tooltip
                          title={`Checklist da etapa: ${card.checklist.requiredDone} de ${card.checklist.requiredTotal} obrigatórios aprovados`}
                        >
                          <LinearProgress
                            variant="determinate"
                            value={card.checklist.percent}
                            color={card.checklist.percent === 100 ? 'success' : 'primary'}
                            sx={{ borderRadius: 1, height: 5 }}
                          />
                        </Tooltip>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Chip
                            size="small"
                            label={LEAD_SOURCE_LABEL[card.leadSource]}
                            color={SOURCE_COLOR[card.leadSource]}
                            variant="outlined"
                          />
                          {next && !next.isTerminal && can('opp.move_stage') && (
                            <Tooltip title={`Avançar para ${next.name}`}>
                              <Button
                                size="small"
                                onClick={(e) => {
                                  e.preventDefault();
                                  advance.mutate({ id: card.id, toStageId: next.stageId });
                                }}
                                endIcon={<ArrowForwardIcon fontSize="small" />}
                                disabled={advance.isPending}
                              >
                                Avançar
                              </Button>
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>
                    </CardActionArea>
                  </Card>
                  );
                })}
              </Stack>
            </Box>
          );
        })}
      </Box>

      {/* Regressão administrativa via arraste (RN-025) */}
      <Dialog open={!!regress} onClose={() => setRegress(null)} fullWidth maxWidth="sm">
        <DialogTitle>Voltar etapa — {regress?.label}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Regressão administrativa (RN-025) para <b>{regress?.toName}</b>. A ação fica registrada
            na auditoria como <i>regress</i>, com a justificativa abaixo.
          </Alert>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Justificativa (obrigatória, mín. 5 caracteres)"
            value={regressReason}
            onChange={(e) => setRegressReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegress(null)}>Cancelar</Button>
          <Button variant="contained" disabled={regressReason.trim().length < 5} onClick={() => void confirmRegress()}>
            Voltar etapa
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!blocked} onClose={() => setBlocked(null)}>
        <DialogTitle>Avanço bloqueado pela governança documental</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {blocked?.message}
          </Alert>
          <List dense>
            {blocked?.pendingItems.map((item) => (
              <ListItem key={item.checklistItemId}>
                <ListItemText primary={item.name} secondary={`Status: ${item.status}`} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlocked(null)}>Fechar</Button>
          <Button
            variant="contained"
            component={Link}
            to={`/oportunidades/${blocked?.opportunityId}?tab=documentos`}
            onClick={() => setBlocked(null)}
          >
            Resolver documentos
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
