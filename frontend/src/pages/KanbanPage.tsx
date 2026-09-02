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
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { formatBRL, LEAD_SOURCE_LABEL, type KanbanColumn } from '../lib/types';

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

export default function KanbanPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [blocked, setBlocked] = useState<BlockedInfo | null>(null);

  const kanban = useQuery({
    queryKey: ['kanban'],
    queryFn: () => api.get<KanbanColumn[]>('/opportunities/kanban'),
    refetchInterval: 30_000,
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

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Pipeline comercial
        </Typography>
        {can('opp.create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/oportunidades/nova')}>
            Nova oportunidade
          </Button>
        )}
      </Stack>

      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
        {columns.map((col, index) => {
          const next = columns[index + 1];
          return (
            <Box key={col.stageId} sx={{ minWidth: 272, maxWidth: 272, flexShrink: 0 }}>
              <Box
                sx={{
                  borderTop: 3,
                  borderColor: col.color ?? 'divider',
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  p: 1.5,
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {col.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {col.count} oportunidade{col.count === 1 ? '' : 's'} · {formatBRL(col.totalValue)}
                </Typography>
              </Box>

              <Stack spacing={1}>
                {col.cards.map((card) => (
                  <Card key={card.id} variant="outlined">
                    <CardActionArea component={Link} to={`/oportunidades/${card.id}`} sx={{ p: 1.5 }}>
                      <Stack spacing={0.75}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" fontWeight={700}>
                            {card.code}
                          </Typography>
                          {card.overdue && (
                            <Tooltip title="Prazo de fechamento vencido">
                              <WarningAmberIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Stack>
                        <Typography variant="body2" noWrap>
                          {card.clientName ?? '—'}
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
                            color={card.checklist.percent === 100 ? 'success' : 'inherit'}
                            sx={{ borderRadius: 1, height: 6 }}
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
                ))}
              </Stack>
            </Box>
          );
        })}
      </Box>

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
