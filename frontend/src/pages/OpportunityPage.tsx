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
  Divider,
  Grid2 as Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import {
  FOCAL_PAPEL_LABEL,
  formatBRL,
  LEAD_SOURCE_LABEL,
  STATUS_LABEL,
  type ChecklistResponse,
  type FocalPoint,
  type Opportunity,
  type OpportunityFocalPoint,
  type PortalDocument,
  type Stage,
} from '../lib/types';

const TABS = ['dados', 'checklist', 'documentos', 'historico', 'comentarios'] as const;

export default function OpportunityPage() {
  const { id } = useParams();
  const oppId = Number(id);
  const [params, setParams] = useSearchParams();
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab')! : 'dados';
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);

  const opp = useQuery({
    queryKey: ['opportunity', oppId],
    queryFn: () => api.get<Opportunity>(`/opportunities/${oppId}`),
  });
  const checklist = useQuery({
    queryKey: ['checklist', oppId],
    queryFn: () => api.get<ChecklistResponse>(`/opportunities/${oppId}/checklist`),
  });
  const stages = useQuery({ queryKey: ['stages'], queryFn: () => api.get<Stage[]>('/stages') });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['opportunity', oppId] }),
      queryClient.invalidateQueries({ queryKey: ['checklist', oppId] }),
      queryClient.invalidateQueries({ queryKey: ['documents', oppId] }),
      queryClient.invalidateQueries({ queryKey: ['history', oppId] }),
      queryClient.invalidateQueries({ queryKey: ['kanban'] }),
    ]);

  const advance = useMutation({
    mutationFn: (toStageId: number) => api.post(`/opportunities/${oppId}/transition`, { toStageId }),
    onSuccess: async () => {
      setFeedback({ severity: 'success', text: 'Etapa avançada com sucesso.' });
      await invalidate();
    },
    onError: (error) =>
      setFeedback({ severity: 'error', text: error instanceof ApiError ? error.message : 'Falha ao avançar.' }),
  });

  if (opp.isLoading) return <LinearProgress />;
  if (opp.error || !opp.data) return <Alert severity="error">Oportunidade não encontrada.</Alert>;
  const data = opp.data;
  const progress = checklist.data?.currentStage;
  const nextStage = (stages.data ?? [])
    .filter((s) => !s.isTerminal && s.position > (data.stage?.position ?? 0))
    .sort((a, b) => a.position - b.position)[0];

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          {data.code}
        </Typography>
        <Chip label={data.stage?.name} sx={{ bgcolor: data.stage?.color ?? undefined, color: '#fff' }} />
        <Chip
          label={data.status.toUpperCase()}
          color={data.status === 'aberta' ? 'info' : data.status === 'ganha' ? 'success' : 'default'}
          variant="outlined"
        />
        <Chip label={`Origem: ${LEAD_SOURCE_LABEL[data.leadSource]}`} variant="outlined" />
        <Box sx={{ flexGrow: 1 }} />
        {data.status === 'aberta' && can('opp.move_stage') && (
          <Button
            variant="contained"
            disabled={!progress?.canAdvance || !nextStage || advance.isPending}
            onClick={() => nextStage && advance.mutate(nextStage.id)}
            title={progress?.canAdvance ? `Avançar para ${nextStage?.name ?? ''}` : 'Checklist obrigatório incompleto (RN-001)'}
          >
            Avançar etapa
          </Button>
        )}
        {data.status === 'aberta' && can('opp.close') && (
          <Button color="error" variant="outlined" onClick={() => setCloseOpen(true)}>
            Encerrar
          </Button>
        )}
      </Stack>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {data.client?.name} {data.client?.orgao ? `· ${data.client.orgao}` : ''} ·{' '}
        {formatBRL(data.valorEstimado)} estimado
        {data.probabilidade != null ? ` · ${data.probabilidade}% probabilidade` : ''}
        {data.expectedCloseDate ? ` · fechamento previsto ${data.expectedCloseDate}` : ''}
      </Typography>

      {progress && data.status === 'aberta' && (
        <Alert severity={progress.canAdvance ? 'success' : 'warning'} sx={{ mb: 2 }}>
          Checklist da etapa atual: {progress.requiredDone} de {progress.requiredTotal} obrigatórios
          aprovados {progress.canAdvance ? '— pronto para avançar.' : '— avanço bloqueado (RN-001).'}
        </Alert>
      )}
      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback.text}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_e, next) => setParams({ tab: next })} sx={{ mb: 2 }}>
        <Tab value="dados" label="Dados" />
        <Tab value="checklist" label="Checklist" />
        <Tab value="documentos" label="Documentos" />
        <Tab value="historico" label="Histórico" />
        <Tab value="comentarios" label="Comentários" />
      </Tabs>

      {tab === 'dados' && (
        <>
          <FocalPointsSection
            oppId={oppId}
            clientUf={data.client?.uf ?? null}
            canManage={can('opp.update') || can('opp.focal.manage')}
          />
          <Divider sx={{ my: 3 }} />
          <DataTab data={data} />
        </>
      )}
      {tab === 'checklist' && <ChecklistTab oppId={oppId} />}
      {tab === 'documentos' && <DocumentsTab oppId={oppId} onChanged={invalidate} />}
      {tab === 'historico' && <HistoryTab oppId={oppId} />}
      {tab === 'comentarios' && <CommentsTab oppId={oppId} />}

      <CloseDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        oppId={oppId}
        onDone={async () => {
          setCloseOpen(false);
          await invalidate();
        }}
      />
    </Box>
  );
}

function FocalPointsSection({
  oppId,
  clientUf,
  canManage,
}: {
  oppId: number;
  clientUf: string | null;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState<string | null>(null);

  const links = useQuery({
    queryKey: ['opp-focal', oppId],
    queryFn: () => api.get<OpportunityFocalPoint[]>(`/opportunities/${oppId}/focal-points`),
  });
  const focal = useQuery({
    queryKey: ['focal-points', '', '', false],
    queryFn: () => api.get<FocalPoint[]>('/focal-points'),
    enabled: addOpen,
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['opp-focal', oppId] }),
      queryClient.invalidateQueries({ queryKey: ['history', oppId] }),
    ]);

  async function add() {
    setError(null);
    try {
      await api.post(`/opportunities/${oppId}/focal-points`, { focalPointId: Number(selected) });
      setAddOpen(false);
      setSelected('');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao vincular.');
    }
  }

  async function remove(linkId: number) {
    await api.delete(`/opportunity-focal-points/${linkId}`);
    await refresh();
  }

  async function togglePrincipal(link: OpportunityFocalPoint) {
    await api.patch(`/opportunity-focal-points/${link.id}`, { principal: !link.principal });
    await refresh();
  }

  const linkedIds = new Set((links.data ?? []).map((l) => l.focalPoint.id));
  const options = [...(focal.data ?? [])].sort((a, b) => {
    const ca = clientUf && a.coverage.some((c) => c.uf === clientUf) ? 0 : 1;
    const cb = clientUf && b.coverage.some((c) => c.uf === clientUf) ? 0 : 1;
    return ca - cb || a.name.localeCompare(b.name);
  });

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Responsáveis SERPRO (pontos focais)
        </Typography>
        {clientUf && <Chip size="small" variant="outlined" label={`UF do cliente: ${clientUf}`} />}
        <Box sx={{ flexGrow: 1 }} />
        {canManage && (
          <Button size="small" variant="outlined" onClick={() => setAddOpen(true)}>
            Vincular responsável
          </Button>
        )}
      </Stack>
      {links.isLoading && <LinearProgress />}
      {!links.isLoading && (links.data ?? []).length === 0 && (
        <Alert severity="info">
          Nenhum responsável SERPRO vinculado — vincule quem cobre a UF do cliente.
        </Alert>
      )}
      <Stack spacing={1}>
        {(links.data ?? []).map((l) => (
          <Stack
            key={l.id}
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 1 }}
          >
            <Tooltip title={l.principal ? 'Responsável principal' : 'Marcar como principal'}>
              <span>
                <IconButton
                  size="small"
                  disabled={!canManage}
                  onClick={() => void togglePrincipal(l)}
                  color={l.principal ? 'warning' : 'default'}
                >
                  {l.principal ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Box sx={{ minWidth: 200 }}>
              <Typography fontWeight={600}>{l.focalPoint.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {l.focalPoint.email ?? ''} {l.focalPoint.phone ? `· ${l.focalPoint.phone}` : ''}
              </Typography>
            </Box>
            <Chip size="small" variant="outlined" label={FOCAL_PAPEL_LABEL[l.focalPoint.papel] ?? l.focalPoint.papel} />
            {l.autoAssigned && (
              <Tooltip title="Vinculado automaticamente pela UF do cliente (RN-023)">
                <Chip size="small" label="automático" sx={{ bgcolor: 'rgba(96,207,226,0.12)' }} />
              </Tooltip>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {canManage && (
              <Tooltip title="Remover vínculo">
                <IconButton size="small" onClick={() => void remove(l.id)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ))}
      </Stack>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Vincular responsável SERPRO</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            select
            fullWidth
            label="Ponto focal"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            sx={{ mt: 1 }}
          >
            {options.map((fp) => (
              <MenuItem key={fp.id} value={String(fp.id)} disabled={linkedIds.has(fp.id)}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                  <span>{fp.name}</span>
                  <Typography variant="caption" color="text.secondary">
                    {FOCAL_PAPEL_LABEL[fp.papel] ?? fp.papel}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  {clientUf && fp.coverage.some((c) => c.uf === clientUf) && (
                    <Chip size="small" label={`cobre ${clientUf}`} color="info" variant="outlined" />
                  )}
                  {linkedIds.has(fp.id) && <Chip size="small" label="já vinculado" variant="outlined" />}
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Novos pontos focais são cadastrados na área “Pontos Focais” do menu.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!selected} onClick={() => void add()}>
            Vincular
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography>{value ?? '—'}</Typography>
    </Grid>
  );
}

function DataTab({ data }: { data: Opportunity }) {
  return (
    <Grid container spacing={2}>
      <Field label="Objeto" value={data.objeto} />
      <Field label="Solução" value={data.solucao} />
      <Field label="Cliente / Órgão" value={`${data.client?.name ?? '—'} ${data.client?.orgao ?? ''}`} />
      <Field label="CNPJ" value={data.client?.cnpj} />
      <Field label="Município/UF" value={data.client ? `${data.client.municipio ?? '—'} / ${data.client.uf ?? '—'}` : '—'} />
      <Field
        label="Contato principal"
        value={data.client ? `${data.client.contactName ?? '—'} · ${data.client.contactEmail ?? ''} ${data.client.contactPhone ?? ''}` : '—'}
      />
      <Field label="Valor estimado" value={formatBRL(data.valorEstimado)} />
      <Field label="Receita prevista" value={formatBRL(data.receitaPrevista)} />
      <Field label="Probabilidade" value={data.probabilidade != null ? `${data.probabilidade}%` : '—'} />
      <Field label="Complexidade" value={data.complexidade} />
      <Field label="Situação comercial" value={data.situacaoComercial} />
      <Field label="Prazo estimado" value={data.prazoEstimado} />
      <Field label="Gestor XPTO" value={data.gestorXpto?.fullName} />
      <Field label="Gestor SERPRO" value={data.gestorSerpro?.fullName} />
      <Field label="Parceiro" value={data.partner?.name} />
      <Field label="Criada em" value={new Date(data.createdAt).toLocaleString('pt-BR')} />
      <Field label="Observações" value={data.observacoes} />
      {data.closureReason && <Field label="Motivo do encerramento" value={data.closureReason} />}
    </Grid>
  );
}

function ChecklistTab({ oppId }: { oppId: number }) {
  const checklist = useQuery({
    queryKey: ['checklist', oppId],
    queryFn: () => api.get<ChecklistResponse>(`/opportunities/${oppId}/checklist`),
  });
  if (checklist.isLoading) return <LinearProgress />;
  const items = checklist.data?.items ?? [];
  const stages = [...new Map(items.map((i) => [i.stageId, i.stageName])).entries()];
  return (
    <Stack spacing={2}>
      {stages.map(([stageId, stageName]) => (
        <Box key={stageId}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            {stageName}
          </Typography>
          <List dense disablePadding>
            {items
              .filter((i) => i.stageId === stageId)
              .map((item) => (
                <ListItem key={item.id} divider>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        {item.status === 'aprovado' || item.status === 'dispensado' ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : item.status === 'rejeitado' ? (
                          <CancelIcon color="error" fontSize="small" />
                        ) : null}
                        <span>{item.name}</span>
                        {item.required && <Chip size="small" label="obrigatório" variant="outlined" />}
                      </Stack>
                    }
                    secondary={`${STATUS_LABEL[item.status]}${item.waivedReason ? ` — dispensa: ${item.waivedReason}` : ''}`}
                  />
                </ListItem>
              ))}
          </List>
        </Box>
      ))}
      {items.length === 0 && <Alert severity="info">Nenhum item de checklist instanciado ainda.</Alert>}
    </Stack>
  );
}

function DocumentsTab({ oppId, onChanged }: { oppId: number; onChanged: () => Promise<unknown> }) {
  const { can } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const checklist = useQuery({
    queryKey: ['checklist', oppId],
    queryFn: () => api.get<ChecklistResponse>(`/opportunities/${oppId}/checklist`),
  });
  const docs = useQuery({
    queryKey: ['documents', oppId],
    queryFn: () => api.get<PortalDocument[]>(`/opportunities/${oppId}/documents`),
  });
  const [uploadItem, setUploadItem] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [rejecting, setRejecting] = useState<PortalDocument | null>(null);
  const [justification, setJustification] = useState('');

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Operação falhou.');
    }
  }

  const pendingItems = (checklist.data?.items ?? []).filter(
    (i) => i.isCurrentStage && !i.documentId && i.status !== 'dispensado',
  );

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {can('opp.doc.upload') && (
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            select
            size="small"
            label="Item do checklist (opcional)"
            value={uploadItem}
            onChange={(e) => setUploadItem(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ minWidth: 280 }}
          >
            <MenuItem value="">Documento avulso</MenuItem>
            {pendingItems.map((i) => (
              <MenuItem key={i.id} value={i.id}>
                {i.name}
              </MenuItem>
            ))}
          </TextField>
          <Button component="label" startIcon={<UploadFileIcon />} variant="outlined">
            {file ? file.name : 'Escolher arquivo'}
            <input hidden type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Button>
          <Button
            variant="contained"
            disabled={!file}
            onClick={() =>
              run(async () => {
                const form = new FormData();
                form.append('file', file!);
                form.append('name', file!.name);
                if (uploadItem !== '') form.append('checklistItemId', String(uploadItem));
                await api.postForm(`/opportunities/${oppId}/documents`, form);
                setFile(null);
                setUploadItem('');
              })
            }
          >
            Enviar
          </Button>
        </Stack>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Documento</TableCell>
            <TableCell>Categoria</TableCell>
            <TableCell>Versão</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Responsável</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(docs.data ?? []).map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.name}</TableCell>
              <TableCell>{doc.category ?? '—'}</TableCell>
              <TableCell>v{doc.currentVersion}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={STATUS_LABEL[doc.status]}
                  color={doc.status === 'aprovado' ? 'success' : doc.status === 'rejeitado' ? 'error' : 'warning'}
                />
              </TableCell>
              <TableCell>{doc.creator?.fullName ?? '—'}</TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() =>
                    run(async () => {
                      const { url } = await api.get<{ url: string }>(
                        `/documents/${doc.id}/versions/${doc.currentVersion}/download`,
                      );
                      window.open(url, '_blank', 'noopener');
                    })
                  }
                >
                  Baixar
                </Button>
                {can('opp.doc.approve') && doc.status === 'em_analise' && (
                  <>
                    <Button size="small" color="success" onClick={() => run(() => api.post(`/documents/${doc.id}/approve`))}>
                      Aprovar
                    </Button>
                    <Button size="small" color="error" onClick={() => setRejecting(doc)}>
                      Rejeitar
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
          {(docs.data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>
                <Typography color="text.secondary">Nenhum documento enviado.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} fullWidth maxWidth="sm">
        <DialogTitle>Rejeitar “{rejecting?.name}”</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Justificativa (obrigatória — RN-012)"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!justification.trim()}
            onClick={() =>
              run(async () => {
                await api.post(`/documents/${rejecting!.id}/reject`, { justification });
                setRejecting(null);
                setJustification('');
              })
            }
          >
            Rejeitar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function HistoryTab({ oppId }: { oppId: number }) {
  const history = useQuery({
    queryKey: ['history', oppId],
    queryFn: () =>
      api.get<{
        transitions: Array<{ id: number; movedAt: string; justification: string | null }>;
        audit: Array<{ action: string; field: string | null; oldValue: string | null; newValue: string | null; occurredAt: string; actorName: string }>;
      }>(`/opportunities/${oppId}/history`),
  });
  if (history.isLoading) return <LinearProgress />;
  return (
    <List dense>
      {(history.data?.audit ?? []).map((row, index) => (
        <ListItem key={index} divider>
          <ListItemText
            primary={`${row.action}${row.field ? ` · ${row.field}` : ''}${
              row.oldValue || row.newValue ? `: ${row.oldValue ?? '∅'} → ${row.newValue ?? '∅'}` : ''
            }`}
            secondary={`${row.actorName} · ${new Date(row.occurredAt).toLocaleString('pt-BR')}`}
          />
        </ListItem>
      ))}
    </List>
  );
}

function CommentsTab({ oppId }: { oppId: number }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const comments = useQuery({
    queryKey: ['comments', oppId],
    queryFn: () =>
      api.get<Array<{ id: number; body: string; createdAt: string; author?: { fullName: string } }>>(
        `/opportunities/${oppId}/comments`,
      ),
  });
  const add = useMutation({
    mutationFn: () => api.post(`/opportunities/${oppId}/comments`, { body }),
    onSuccess: async () => {
      setBody('');
      await queryClient.invalidateQueries({ queryKey: ['comments', oppId] });
    },
  });
  return (
    <Stack spacing={2}>
      {(comments.data ?? []).map((c) => (
        <Box key={c.id}>
          <Typography variant="subtitle2">{c.author?.fullName ?? '—'}</Typography>
          <Typography variant="body2">{c.body}</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(c.createdAt).toLocaleString('pt-BR')}
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Box>
      ))}
      {can('opp.comment') && (
        <Stack direction="row" spacing={1}>
          <TextField fullWidth size="small" placeholder="Escreva um comentário" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button variant="contained" disabled={!body.trim() || add.isPending} onClick={() => add.mutate()}>
            Comentar
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

function CloseDialog({
  open,
  onClose,
  oppId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  oppId: number;
  onDone: () => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<'ganha' | 'perdida' | 'cancelada'>('ganha');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Encerrar oportunidade</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select label="Resultado" value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
            <MenuItem value="ganha">Ganha</MenuItem>
            <MenuItem value="perdida">Perdida</MenuItem>
            <MenuItem value="cancelada">Cancelada</MenuItem>
          </TextField>
          <TextField
            multiline
            minRows={3}
            label="Justificativa (obrigatória — RN-008)"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color="error"
          disabled={!justification.trim()}
          onClick={async () => {
            try {
              await api.post(`/opportunities/${oppId}/close`, { outcome, justification });
              await onDone();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : 'Falha ao encerrar.');
            }
          }}
        >
          Encerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
