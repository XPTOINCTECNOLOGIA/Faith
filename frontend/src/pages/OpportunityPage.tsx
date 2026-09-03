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
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { actionLabel, entityLabel } from '../lib/labels';
import { DS, STATE_SOFT } from '../theme';
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

const TABS = ['dados', 'maturidade', 'probabilidade', 'ficha', 'checklist', 'documentos', 'historico', 'comentarios'] as const;

export default function OpportunityPage() {
  const { id } = useParams();
  const oppId = Number(id);
  const [params, setParams] = useSearchParams();
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab')! : 'dados';
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [regressOpen, setRegressOpen] = useState(false);
  const [regressStage, setRegressStage] = useState('');
  const [regressReason, setRegressReason] = useState('');

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
  // RN-025: etapas anteriores não-terminais, disponíveis para regressão administrativa
  const earlierStages = (stages.data ?? [])
    .filter((s) => !s.isTerminal && s.active !== false && s.position < (data.stage?.position ?? 0))
    .sort((a, b) => a.position - b.position);

  async function regress() {
    try {
      await api.post(`/opportunities/${oppId}/transition`, {
        toStageId: Number(regressStage),
        justification: `[Regressão administrativa — RN-025] ${regressReason.trim()}`,
      });
      setRegressOpen(false);
      setRegressStage('');
      setRegressReason('');
      setFeedback({ severity: 'success', text: 'Etapa retornada com sucesso (registrada na auditoria).' });
      await invalidate();
    } catch (e) {
      setFeedback({ severity: 'error', text: e instanceof ApiError ? e.message : 'Falha ao retornar etapa.' });
    }
  }

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
        {data.status === 'aberta' && can('opp.admin') && earlierStages.length > 0 && (
          <Tooltip title="Regressão administrativa (RN-025): retorna a oportunidade a uma etapa anterior, com justificativa auditada">
            <Button variant="outlined" onClick={() => setRegressOpen(true)}>
              Voltar etapa
            </Button>
          </Tooltip>
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
        <Tab value="maturidade" label="Maturidade" />
        <Tab value="probabilidade" label="Probabilidade" />
        <Tab value="ficha" label="Ficha técnica" />
        <Tab value="checklist" label="Checklist" />
        <Tab value="documentos" label="Documentos" />
        <Tab value="historico" label="Linha do tempo" />
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
      {tab === 'maturidade' && <MaturityTab oppId={oppId} stageName={data.stage?.name ?? null} />}
      {tab === 'probabilidade' && (
        <ProbabilityTab oppId={oppId} data={data} onChanged={invalidate} />
      )}
      {tab === 'ficha' && <TechSpecTab oppId={oppId} />}
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

      <Dialog open={regressOpen} onClose={() => setRegressOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Voltar etapa (regressão administrativa)</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            RN-025: disponível apenas para administração. A oportunidade retorna à etapa escolhida,
            o checklist das etapas permanece como está, e a operação fica registrada na trilha de
            auditoria com a sua justificativa.
          </Alert>
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              label="Retornar para a etapa"
              value={regressStage}
              onChange={(e) => setRegressStage(e.target.value)}
            >
              {earlierStages.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.position}. {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              required
              multiline
              minRows={2}
              label="Justificativa (obrigatória)"
              value={regressReason}
              onChange={(e) => setRegressReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegressOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!regressStage || regressReason.trim().length < 5}
            onClick={() => void regress()}
          >
            Voltar etapa
          </Button>
        </DialogActions>
      </Dialog>
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
                <Chip size="small" label="automático" sx={{ bgcolor: '#DDEFF4', color: '#14556B' }} />
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

/* ── Indicador de Probabilidade ──────────────────────────────────────────────
   O valor OFICIAL é informado manualmente e restrito a opp.admin (RN-026,
   trigger no banco). Ao lado, um score de referência transparente, calculado
   dos dados que a plataforma já tem (maturidade, checklist, ficha técnica,
   completude comercial, momentum) — semente das métricas futuras. */

function Gauge({ value, color }: { value: number | null; color: string }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const v = value ?? 0;
  return (
    <Box sx={{ position: 'relative', width: 140, height: 140 }}>
      <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label={`${value ?? '—'}%`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke={DS.border} strokeWidth="12" />
        <circle
          cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${(v / 100) * C} ${C}`}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {value == null ? '—' : `${value}%`}
        </Typography>
      </Box>
    </Box>
  );
}

function ProbabilityTab({
  oppId,
  data,
  onChanged,
}: {
  oppId: number;
  data: Opportunity;
  onChanged: () => Promise<unknown>;
}) {
  const { can } = useAuth();
  const isAdmin = can('opp.admin');
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const maturity = useQuery({
    queryKey: ['maturity', oppId],
    queryFn: () => api.get<MaturityRow[]>(`/opportunities/${oppId}/maturity`),
  });
  const checklist = useQuery({
    queryKey: ['checklist', oppId],
    queryFn: () => api.get<ChecklistResponse>(`/opportunities/${oppId}/checklist`),
  });
  const spec = useQuery({
    queryKey: ['tech-spec', oppId],
    queryFn: () => api.get<TechSpec>(`/opportunities/${oppId}/tech-spec`),
  });
  const stages = useQuery({ queryKey: ['stages'], queryFn: () => api.get<Stage[]>('/stages') });
  const history = useQuery({
    queryKey: ['history', oppId],
    queryFn: () =>
      api.get<{ audit: Array<{ occurredAt: string }> }>(`/opportunities/${oppId}/history`),
  });

  // ── fatores do score de referência (pesos somam 100) ──
  const matRows = maturity.data ?? [];
  const matAplic = matRows.filter((r) => r.status !== 'nao_aplicavel');
  const matPct = matAplic.length
    ? matAplic.filter((r) => r.status === 'concluida').length / matAplic.length
    : 0;

  const clItems = (checklist.data?.items ?? []).filter((i) => i.isCurrentStage);
  const clPct = clItems.length
    ? clItems.filter((i) => i.status === 'aprovado' || i.status === 'dispensado').length / clItems.length
    : 0.5; // sem itens instanciados: neutro

  const fichaPct =
    ((spec.data?.descricao ? 1 : 0) + ((spec.data?.items.length ?? 0) > 0 ? 1 : 0)) / 2;

  const comercialChecks = [
    data.valorEstimado != null,
    !!(data.prazoEstimado || data.expectedCloseDate),
    !!data.gestorXpto,
    !!data.gestorSerpro,
    !!data.client,
  ];
  const comercialPct = comercialChecks.filter(Boolean).length / comercialChecks.length;

  const lastActivity = history.data?.audit?.[0]?.occurredAt ?? null;
  const idleDias = lastActivity ? diasDesde(lastActivity.slice(0, 10)) : 999;
  const momentumPct = idleDias <= 7 ? 1 : idleDias <= 30 ? 0.5 : 0;

  const maxPos = Math.max(1, ...(stages.data ?? []).filter((s) => !s.isTerminal).map((s) => s.position));
  const estagioPct = (data.stage?.position ?? 0) / maxPos;

  const fatores = [
    { nome: 'Maturidade da esteira', peso: 30, pct: matPct },
    { nome: 'Completude comercial', peso: 20, pct: comercialPct },
    { nome: 'Checklist da etapa atual', peso: 15, pct: clPct },
    { nome: 'Ficha técnica', peso: 15, pct: fichaPct },
    { nome: 'Estágio no Pipeline', peso: 10, pct: estagioPct },
    { nome: 'Momentum (atividade recente)', peso: 10, pct: momentumPct },
  ];
  const carregando = maturity.isLoading || checklist.isLoading || spec.isLoading || history.isLoading;
  const score = Math.round(fatores.reduce((a, f) => a + f.peso * f.pct, 0));
  const manual = data.probabilidade;
  const delta = manual == null ? null : score - manual;

  async function saveManual() {
    setError(null);
    const v = Number(draft);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      setError('Informe um valor entre 0 e 100.');
      return;
    }
    try {
      await api.patch(`/opportunities/${oppId}`, { probabilidade: Math.round(v) });
      setEditOpen(false);
      await onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao salvar (RN-026: requer opp.admin).');
    }
  }

  return (
    <Grid container spacing={2}>
      {/* Indicador oficial */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Box sx={{ border: `1px solid ${DS.border}`, borderRadius: 2, p: 2.5, height: '100%', bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Indicador oficial de probabilidade
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Definido manualmente por administradores do módulo (RN-026).
          </Typography>
          <Stack alignItems="center" spacing={2}>
            <Gauge value={manual} color={DS.ciano} />
            {manual == null && (
              <Typography variant="body2" color="text.secondary">
                Ainda não informado.
              </Typography>
            )}
            {isAdmin ? (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => {
                  setDraft(manual == null ? '' : String(manual));
                  setError(null);
                  setEditOpen(true);
                }}
              >
                {manual == null ? 'Informar probabilidade' : 'Ajustar'}
              </Button>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Somente SUPER ADMIN (opp.admin) pode alterar este indicador.
              </Typography>
            )}
          </Stack>
        </Box>
      </Grid>

      {/* Score de referência */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Box sx={{ border: `1px solid ${DS.border}`, borderRadius: 2, p: 2.5, height: '100%', bgcolor: 'background.paper' }}>
          <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Score de referência (calculado)</Typography>
            <Chip size="small" label="beta" sx={{ height: 18, fontSize: 11, bgcolor: DS.navySoft, color: DS.ardosia }} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Calculado dos dados da plataforma — apoia a decisão, não substitui o indicador oficial.
          </Typography>
          {carregando ? (
            <LinearProgress />
          ) : (
            <>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', color: DS.ardosia }}>
                  {score}%
                </Typography>
                {delta != null && (
                  <Chip
                    size="small"
                    label={
                      delta === 0
                        ? 'alinhado ao oficial'
                        : `${delta > 0 ? '+' : ''}${delta} pp vs. oficial`
                    }
                    sx={{
                      bgcolor: Math.abs(delta) <= 10 ? STATE_SOFT.success.bg : STATE_SOFT.warning.bg,
                      color: Math.abs(delta) <= 10 ? STATE_SOFT.success.color : STATE_SOFT.warning.color,
                    }}
                  />
                )}
              </Stack>
              <Stack spacing={1.25}>
                {fatores.map((f) => (
                  <Box key={f.nome}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                      <Typography variant="caption">{f.nome}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(f.peso * f.pct)}/{f.peso}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={f.pct * 100}
                      sx={{ height: 6, '& .MuiLinearProgress-bar': { bgcolor: DS.ardosia } }}
                    />
                  </Box>
                ))}
              </Stack>
            </>
          )}
        </Box>
      </Grid>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Indicador de probabilidade</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              type="number"
              label="Probabilidade (%)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              inputProps={{ min: 0, max: 100, step: 5 }}
              helperText={`Score de referência atual: ${score}%`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={draft === ''} onClick={() => void saveManual()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

/* ── Esteira de Maturidade ───────────────────────────────────────────────────
   Segundo eixo de acompanhamento, distinto do funil comercial: em que
   momento REAL o projeto está (demanda → expansão). Fases podem correr em
   paralelo; a divergência entre o estágio comercial e a fase técnica é
   informação de gestão exibida no cabeçalho. */

const MAT_STATUS = [
  { value: 'pendente', label: 'Pendente', tone: 'neutral' },
  { value: 'em_andamento', label: 'Em andamento', tone: 'info' },
  { value: 'concluida', label: 'Concluída', tone: 'success' },
  { value: 'nao_aplicavel', label: 'Não se aplica', tone: 'neutral' },
] as const;
const matStatus = (s: string) => MAT_STATUS.find((x) => x.value === s) ?? MAT_STATUS[0];

interface MaturityRow {
  phaseId: number; code: string; name: string; position: number;
  status: string; startedOn: string | null; completedOn: string | null;
  responsavel: string; nota: string; updatedAt: string | null; updatedByName: string | null;
}

const hoje = () => new Date().toISOString().slice(0, 10);
const diasDesde = (iso: string) =>
  Math.max(0, Math.round((Date.now() - new Date(`${iso}T12:00:00`).getTime()) / 86_400_000));
const diasEntre = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000));

function segColor(status: string) {
  if (status === 'concluida') return DS.ardosia;
  if (status === 'em_andamento') return DS.ciano;
  if (status === 'nao_aplicavel') return 'transparent';
  return DS.border;
}

function MaturityTab({ oppId, stageName }: { oppId: number; stageName: string | null }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = can('opp.update');
  const [editRow, setEditRow] = useState<MaturityRow | null>(null);
  const [form, setForm] = useState({ status: 'pendente', startedOn: '', completedOn: '', responsavel: '', nota: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  const maturity = useQuery({
    queryKey: ['maturity', oppId],
    queryFn: () => api.get<MaturityRow[]>(`/opportunities/${oppId}/maturity`),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['maturity', oppId] }),
      queryClient.invalidateQueries({ queryKey: ['history', oppId] }),
    ]);

  if (maturity.isLoading) return <LinearProgress />;
  const rows = maturity.data ?? [];

  const aplicaveis = rows.filter((r) => r.status !== 'nao_aplicavel');
  const concluidas = aplicaveis.filter((r) => r.status === 'concluida');
  const pct = aplicaveis.length ? Math.round((concluidas.length / aplicaveis.length) * 100) : 0;
  const emAndamento = rows.filter((r) => r.status === 'em_andamento');
  const faseAtual =
    emAndamento[0] ??
    aplicaveis.find((r) => r.status === 'pendente' && r.position > (concluidas.at(-1)?.position ?? 0)) ??
    null;

  async function save(row: MaturityRow, patch: Partial<typeof form>) {
    setError(null);
    setSaving(row.phaseId);
    const body = {
      status: patch.status ?? row.status,
      startedOn: patch.startedOn !== undefined ? patch.startedOn || null : row.startedOn,
      completedOn: patch.completedOn !== undefined ? patch.completedOn || null : row.completedOn,
      responsavel: patch.responsavel ?? row.responsavel,
      nota: patch.nota ?? row.nota,
    };
    // datas automáticas nas transições comuns
    if (body.status === 'em_andamento' && !body.startedOn) body.startedOn = hoje();
    if (body.status === 'concluida') {
      if (!body.startedOn) body.startedOn = hoje();
      if (!body.completedOn) body.completedOn = hoje();
    }
    if (body.status !== 'concluida') body.completedOn = patch.completedOn !== undefined ? patch.completedOn || null : null;
    try {
      await api.post(`/opportunities/${oppId}/maturity/${row.phaseId}`, body);
      await invalidate();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao atualizar a fase.');
    } finally {
      setSaving(null);
    }
  }

  async function avancar() {
    const atual = emAndamento[0];
    if (atual) await save(atual, { status: 'concluida' });
    const proxima = rows.find(
      (r) => r.status === 'pendente' && r.position > (atual?.position ?? concluidas.at(-1)?.position ?? 0),
    );
    if (proxima) await save(proxima, { status: 'em_andamento' });
  }

  function openEdit(row: MaturityRow) {
    setEditRow(row);
    setForm({
      status: row.status, startedOn: row.startedOn ?? '', completedOn: row.completedOn ?? '',
      responsavel: row.responsavel, nota: row.nota,
    });
    setError(null);
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Cabeçalho: maturidade × estágio comercial */}
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Maturidade do projeto
          </Typography>
          <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {pct}%{' '}
            <Typography component="span" variant="body2" color="text.secondary">
              · {concluidas.length}/{aplicaveis.length} fases
            </Typography>
          </Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box>
          <Typography variant="caption" color="text.secondary">
            Momento real (técnico)
          </Typography>
          <Typography variant="subtitle1">
            {faseAtual ? faseAtual.name : concluidas.length === aplicaveis.length && aplicaveis.length > 0 ? 'Esteira concluída' : '—'}
            {faseAtual?.status === 'em_andamento' && faseAtual.startedOn && (
              <Typography component="span" variant="body2" color="text.secondary">
                {' '}
                · há {diasDesde(faseAtual.startedOn)} dia{diasDesde(faseAtual.startedOn) === 1 ? '' : 's'}
              </Typography>
            )}
          </Typography>
        </Box>
        {stageName && (
          <>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Estágio comercial (Pipeline)
              </Typography>
              <Typography variant="subtitle1">{stageName}</Typography>
            </Box>
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {canEdit && (
          <Button variant="contained" size="small" onClick={() => void avancar()} disabled={saving != null || (!emAndamento.length && !rows.some((r) => r.status === 'pendente'))}>
            Avançar fase
          </Button>
        )}
      </Stack>

      {/* Esteira visual */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 0.75 }}>
        {rows.map((r) => (
          <Tooltip key={r.phaseId} title={`${r.position}. ${r.name} — ${matStatus(r.status).label}`}>
            <Box
              sx={{
                flexGrow: 1, height: 10, borderRadius: 99,
                bgcolor: segColor(r.status),
                border: r.status === 'nao_aplicavel' ? `1px dashed ${DS.borderStrong}` : 'none',
                transition: 'background-color .2s',
              }}
            />
          </Tooltip>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
        <Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, bgcolor: DS.ardosia, mr: 0.5, verticalAlign: 'middle' }} /> concluída ·{' '}
        <Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, bgcolor: DS.ciano, mx: 0.5, verticalAlign: 'middle' }} /> em andamento ·{' '}
        <Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, bgcolor: DS.border, mx: 0.5, verticalAlign: 'middle' }} /> pendente ·{' '}
        <Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, border: `1px dashed ${DS.borderStrong}`, mx: 0.5, verticalAlign: 'middle' }} /> não se aplica
      </Typography>

      {/* Fases */}
      <Stack spacing={1}>
        {rows.map((r) => {
          const st = matStatus(r.status);
          const tone = STATE_SOFT[st.tone];
          const atual = faseAtual?.phaseId === r.phaseId;
          return (
            <Box
              key={r.phaseId}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25,
                border: `1px solid ${atual ? DS.ciano : DS.border}`, borderRadius: 2,
                bgcolor: atual ? DS.primarySoft : 'background.paper',
                opacity: r.status === 'nao_aplicavel' ? 0.55 : 1,
              }}
            >
              <Box
                sx={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
                  bgcolor: r.status === 'concluida' ? DS.ardosia : r.status === 'em_andamento' ? DS.ciano : DS.navySoft,
                  color: r.status === 'concluida' ? '#fff' : DS.navy,
                }}
              >
                {r.status === 'concluida' ? <CheckCircleIcon sx={{ fontSize: 17 }} /> : r.position}
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {r.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {r.startedOn && `início ${new Date(`${r.startedOn}T12:00:00`).toLocaleDateString('pt-BR')}`}
                  {r.completedOn && ` · conclusão ${new Date(`${r.completedOn}T12:00:00`).toLocaleDateString('pt-BR')}`}
                  {r.startedOn && r.completedOn && ` (${diasEntre(r.startedOn, r.completedOn)} d)`}
                  {r.responsavel && ` · ${r.responsavel}`}
                  {r.nota && ` — ${r.nota}`}
                </Typography>
              </Box>
              <Chip size="small" label={st.label} sx={{ bgcolor: tone.bg, color: tone.color, flexShrink: 0 }} />
              {canEdit && (
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  {r.status === 'pendente' && (
                    <Button size="small" disabled={saving === r.phaseId} onClick={() => void save(r, { status: 'em_andamento' })}>
                      Iniciar
                    </Button>
                  )}
                  {r.status === 'em_andamento' && (
                    <Button size="small" disabled={saving === r.phaseId} onClick={() => void save(r, { status: 'concluida' })}>
                      Concluir
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => openEdit(r)} aria-label={`Editar fase ${r.name}`}>
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>

      {/* Dialog de edição da fase */}
      <Dialog open={!!editRow} onClose={() => setEditRow(null)} fullWidth maxWidth="sm">
        <DialogTitle>{editRow?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {MAT_STATUS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                type="date" label="Início" value={form.startedOn}
                onChange={(e) => setForm((f) => ({ ...f, startedOn: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ flexGrow: 1 }}
              />
              <TextField
                type="date" label="Conclusão" value={form.completedOn}
                onChange={(e) => setForm((f) => ({ ...f, completedOn: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ flexGrow: 1 }}
              />
            </Stack>
            <TextField
              label="Responsável (opcional)" value={form.responsavel}
              onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
            />
            <TextField
              multiline minRows={2} label="Nota (opcional)" value={form.nota}
              onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
            />
            {editRow?.updatedAt && (
              <Typography variant="caption" color="text.secondary">
                Última atualização: {editRow.updatedByName ?? '—'} em {new Date(editRow.updatedAt).toLocaleString('pt-BR')}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!editRow) return;
              await save(editRow, { ...form });
              setEditRow(null);
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ── Ficha Técnica Viva ──────────────────────────────────────────────────────
   Descrição da solução + itens estruturados (categoria, quantidade, status
   de ciclo de vida). Comercial, Engenharia, Projetos e Diretoria enxergam
   a mesma realidade; toda alteração vai para a linha do tempo/auditoria. */

const TS_CATEGORIAS = [
  { value: 'equipamento', label: 'Equipamentos' },
  { value: 'software', label: 'Software' },
  { value: 'integracao', label: 'Integrações' },
  { value: 'servico', label: 'Serviços' },
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'outro', label: 'Outros' },
] as const;

const TS_STATUS = [
  { value: 'previsto', label: 'Previsto', tone: 'neutral' },
  { value: 'homologado', label: 'Homologado', tone: 'warning' },
  { value: 'contratado', label: 'Contratado', tone: 'info' },
  { value: 'implantado', label: 'Implantado', tone: 'success' },
] as const;
const tsStatus = (s: string) => TS_STATUS.find((x) => x.value === s) ?? TS_STATUS[0];

interface TechSpecItem {
  id: number; categoria: string; item: string; quantidade: number | null;
  unidade: string; detalhe: string; status: string; ordem: number;
}
interface TechSpec {
  descricao: string; updatedAt: string | null; updatedByName: string | null; items: TechSpecItem[];
}

const EMPTY_TS_ITEM = { categoria: 'equipamento', item: '', quantidade: '', unidade: 'un', detalhe: '', status: 'previsto' };

function TechSpecTab({ oppId }: { oppId: number }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = can('opp.update');
  const [descOpen, setDescOpen] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TechSpecItem | null>(null);
  const [itemForm, setItemForm] = useState({ ...EMPTY_TS_ITEM });
  const [error, setError] = useState<string | null>(null);

  const spec = useQuery({
    queryKey: ['tech-spec', oppId],
    queryFn: () => api.get<TechSpec>(`/opportunities/${oppId}/tech-spec`),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tech-spec', oppId] }),
      queryClient.invalidateQueries({ queryKey: ['history', oppId] }),
    ]);

  if (spec.isLoading) return <LinearProgress />;
  const items = spec.data?.items ?? [];

  async function saveDesc() {
    setError(null);
    try {
      await api.post(`/opportunities/${oppId}/tech-spec`, { descricao: descDraft });
      setDescOpen(false);
      await invalidate();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao salvar a descrição.');
    }
  }

  function openNewItem() {
    setEditingItem(null);
    setItemForm({ ...EMPTY_TS_ITEM });
    setError(null);
    setItemOpen(true);
  }
  function openEditItem(it: TechSpecItem) {
    setEditingItem(it);
    setItemForm({
      categoria: it.categoria, item: it.item,
      quantidade: it.quantidade == null ? '' : String(it.quantidade),
      unidade: it.unidade, detalhe: it.detalhe, status: it.status,
    });
    setError(null);
    setItemOpen(true);
  }
  async function saveItem() {
    setError(null);
    const body = {
      categoria: itemForm.categoria,
      item: itemForm.item.trim(),
      quantidade: itemForm.quantidade === '' ? null : Number(itemForm.quantidade),
      unidade: itemForm.unidade.trim() || 'un',
      detalhe: itemForm.detalhe.trim(),
      status: itemForm.status,
    };
    try {
      if (editingItem) await api.patch(`/tech-spec-items/${editingItem.id}`, body);
      else await api.post(`/opportunities/${oppId}/tech-spec/items`, body);
      setItemOpen(false);
      await invalidate();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao salvar o item.');
    }
  }
  async function removeItem(it: TechSpecItem) {
    await api.delete(`/tech-spec-items/${it.id}`);
    await invalidate();
  }

  function exportCsv() {
    const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const head = 'categoria;item;quantidade;unidade;detalhe;status';
    const lines = items.map((it) =>
      [
        TS_CATEGORIAS.find((c) => c.value === it.categoria)?.label ?? it.categoria,
        esc(it.item),
        it.quantidade == null ? '' : String(it.quantidade).replace('.', ','),
        it.unidade, esc(it.detalhe), tsStatus(it.status).label,
      ].join(';'),
    );
    const url = URL.createObjectURL(new Blob(['﻿' + [head, ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ficha-tecnica-oportunidade-${oppId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box>
      {error && !descOpen && !itemOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Descrição da solução */}
      <Box sx={{ border: `1px solid ${DS.border}`, borderRadius: 2, p: 2, mb: 2, bgcolor: 'background.paper' }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Descrição técnica da solução
          </Typography>
          {canEdit && (
            <Button
              size="small"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => {
                setDescDraft(spec.data?.descricao ?? '');
                setDescOpen(true);
              }}
            >
              Editar
            </Button>
          )}
        </Stack>
        {spec.data?.descricao ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {spec.data.descricao}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Ainda sem descrição — registre aqui o escopo, a arquitetura e as premissas da solução.
          </Typography>
        )}
        {spec.data?.updatedAt && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Atualizada por {spec.data.updatedByName ?? '—'} em{' '}
            {new Date(spec.data.updatedAt).toLocaleString('pt-BR')}
          </Typography>
        )}
      </Box>

      {/* Itens */}
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Composição da solução {items.length > 0 && `· ${items.length} ite${items.length === 1 ? 'm' : 'ns'}`}
        </Typography>
        <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={exportCsv} disabled={items.length === 0}>
          Exportar
        </Button>
        {canEdit && (
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNewItem} sx={{ ml: 1 }}>
            Adicionar item
          </Button>
        )}
      </Stack>

      {items.length === 0 && (
        <Alert severity="info">
          Nenhum item ainda. Estruture aqui equipamentos, software, integrações e serviços do projeto —
          todos passam a enxergar a mesma realidade técnica.
        </Alert>
      )}

      <Stack spacing={2}>
        {TS_CATEGORIAS.filter((c) => items.some((i) => i.categoria === c.value)).map((c) => {
          const group = items.filter((i) => i.categoria === c.value);
          return (
            <Box key={c.value}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                <Typography variant="overline">{c.label}</Typography>
                <Chip size="small" label={group.length} sx={{ height: 18, fontSize: 11 }} />
              </Stack>
              <Box sx={{ border: `1px solid ${DS.border}`, borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableBody>
                    {group.map((it) => {
                      const st = tsStatus(it.status);
                      const tone = STATE_SOFT[st.tone];
                      return (
                        <TableRow key={it.id} hover>
                          <TableCell sx={{ width: 110, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {it.quantidade != null ? (
                              <b>
                                {it.quantidade.toLocaleString('pt-BR')} {it.unidade}
                              </b>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {it.item}
                            </Typography>
                            {it.detalhe && (
                              <Typography variant="caption" color="text.secondary">
                                {it.detalhe}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ width: 130 }}>
                            <Chip size="small" label={st.label} sx={{ bgcolor: tone.bg, color: tone.color }} />
                          </TableCell>
                          {canEdit && (
                            <TableCell align="right" sx={{ width: 90, whiteSpace: 'nowrap' }}>
                              <IconButton size="small" onClick={() => openEditItem(it)} aria-label="Editar item">
                                <EditIcon fontSize="inherit" />
                              </IconButton>
                              <IconButton size="small" onClick={() => void removeItem(it)} aria-label="Remover item">
                                <DeleteOutlineIcon fontSize="inherit" />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          );
        })}
      </Stack>

      {/* Dialog descrição */}
      <Dialog open={descOpen} onClose={() => setDescOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Descrição técnica da solução</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              multiline
              minRows={6}
              placeholder={'Escopo, arquitetura, premissas, dimensionamento…'}
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveDesc()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog item */}
      <Dialog open={itemOpen} onClose={() => setItemOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingItem ? 'Editar item' : 'Adicionar item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Categoria"
                value={itemForm.categoria}
                onChange={(e) => setItemForm((f) => ({ ...f, categoria: e.target.value }))}
                sx={{ flexGrow: 1 }}
              >
                {TS_CATEGORIAS.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Status"
                value={itemForm.status}
                onChange={(e) => setItemForm((f) => ({ ...f, status: e.target.value }))}
                sx={{ width: 170 }}
              >
                {TS_STATUS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Item"
              placeholder="ex.: Câmeras fixas 4K"
              value={itemForm.item}
              onChange={(e) => setItemForm((f) => ({ ...f, item: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                type="number"
                label="Quantidade (opcional)"
                value={itemForm.quantidade}
                onChange={(e) => setItemForm((f) => ({ ...f, quantidade: e.target.value }))}
                sx={{ width: 200 }}
                inputProps={{ min: 0.01, step: 'any' }}
              />
              <TextField
                label="Unidade"
                value={itemForm.unidade}
                onChange={(e) => setItemForm((f) => ({ ...f, unidade: e.target.value }))}
                sx={{ width: 140 }}
              />
            </Stack>
            <TextField
              multiline
              minRows={2}
              label="Detalhe / especificação (opcional)"
              value={itemForm.detalhe}
              onChange={(e) => setItemForm((f) => ({ ...f, detalhe: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!itemForm.item.trim()} onClick={() => void saveItem()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
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

/* ── Documentos (GED / repositório eletrônico do projeto) ────────────────────
   Documentos tipados (catálogo opp_doc_types) e versionados: quem consulta
   sempre vê nome, tipo, versão (v01, v02…), data de inclusão e autor, com
   histórico completo de versões e download por versão. Aceita PDF, Office,
   ZIP etc. (limite 25 MB — RN-011); aprovação/rejeição RN-012/013 mantidas. */

interface DocType { id: number; code: string; name: string; position: number }
interface DocVersion {
  version: number; fileName: string; mimeType: string | null; sizeBytes: number | null;
  observacoes: string | null; uploadedAt: string; uploaderName: string;
}

const DOC_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,.7z,.msg,.eml,.txt,.png,.jpg,.jpeg';

const vLabel = (n: number) => `v${String(n).padStart(2, '0')}`;
const fmtBytes = (b: number | null) => {
  if (b == null) return '';
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

function DocVersionsList({ docId, onDownload }: { docId: number; onDownload: (v: number) => void }) {
  const versions = useQuery({
    queryKey: ['doc-versions', docId],
    queryFn: () => api.get<DocVersion[]>(`/documents/${docId}/versions`),
  });
  if (versions.isLoading) return <LinearProgress sx={{ my: 1 }} />;
  return (
    <Table size="small" sx={{ '& td, & th': { border: 0, py: 0.5 } }}>
      <TableBody>
        {(versions.data ?? []).map((v) => (
          <TableRow key={v.version}>
            <TableCell sx={{ width: 56 }}>
              <Chip size="small" label={vLabel(v.version)} sx={{ bgcolor: DS.navySoft, color: DS.ardosia, fontWeight: 700 }} />
            </TableCell>
            <TableCell>
              <Typography variant="caption">
                {v.fileName}
                {v.sizeBytes != null && ` · ${fmtBytes(v.sizeBytes)}`}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {new Date(v.uploadedAt).toLocaleString('pt-BR')} · {v.uploaderName}
                {v.observacoes && ` — ${v.observacoes}`}
              </Typography>
            </TableCell>
            <TableCell align="right" sx={{ width: 60 }}>
              <IconButton size="small" onClick={() => onDownload(v.version)} aria-label={`Baixar ${vLabel(v.version)}`}>
                <DownloadIcon fontSize="inherit" />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DocumentsTab({ oppId, onChanged }: { oppId: number; onChanged: () => Promise<unknown> }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const checklist = useQuery({
    queryKey: ['checklist', oppId],
    queryFn: () => api.get<ChecklistResponse>(`/opportunities/${oppId}/checklist`),
  });
  const docs = useQuery({
    queryKey: ['documents', oppId],
    queryFn: () => api.get<PortalDocument[]>(`/opportunities/${oppId}/documents`),
  });
  const docTypes = useQuery({ queryKey: ['doc-types'], queryFn: () => api.get<DocType[]>('/doc-types') });

  // novo documento
  const [newOpen, setNewOpen] = useState(false);
  const [newTipo, setNewTipo] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newObs, setNewObs] = useState('');
  const [newItem, setNewItem] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  // outros estados
  const [rejecting, setRejecting] = useState<PortalDocument | null>(null);
  const [justification, setJustification] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [versioning, setVersioning] = useState<number | null>(null);

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
  const items = docs.data ?? [];
  const typeName = (code: string | null) =>
    (docTypes.data ?? []).find((t) => t.code === code)?.name ?? null;

  // agrupamento por tipo, na ordem do catálogo; sem tipo vai para o fim
  const groups: Array<{ key: string; label: string; docs: PortalDocument[] }> = [
    ...(docTypes.data ?? [])
      .map((t) => ({ key: t.code, label: t.name, docs: items.filter((d) => d.docType === t.code) }))
      .filter((g) => g.docs.length > 0),
    ...(items.some((d) => !d.docType || !typeName(d.docType))
      ? [{
          key: '_sem_tipo',
          label: 'Sem tipo definido',
          docs: items.filter((d) => !d.docType || !typeName(d.docType)),
        }]
      : []),
  ];

  async function download(docId: number, version: number) {
    await run(async () => {
      const { url } = await api.get<{ url: string }>(`/documents/${docId}/versions/${version}/download`);
      window.open(url, '_blank', 'noopener');
    });
  }

  async function sendNew() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', newNome.trim() || file.name);
      form.append('docType', newTipo);
      if (newObs.trim()) form.append('observacoes', newObs.trim());
      if (newItem !== '') form.append('checklistItemId', String(newItem));
      await api.postForm(`/opportunities/${oppId}/documents`, form);
      setNewOpen(false);
      setFile(null);
      setNewNome('');
      setNewObs('');
      setNewItem('');
      await onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao enviar o documento.');
    } finally {
      setBusy(false);
    }
  }

  async function sendVersion(doc: PortalDocument, f: File) {
    setVersioning(doc.id);
    await run(async () => {
      const form = new FormData();
      form.append('file', f);
      await api.postForm(`/documents/${doc.id}/versions`, form);
      await queryClient.invalidateQueries({ queryKey: ['doc-versions', doc.id] });
    });
    setVersioning(null);
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2">Repositório do projeto</Typography>
          <Typography variant="caption" color="text.secondary">
            {items.length} documento{items.length === 1 ? '' : 's'} · tipados e versionados — PDF, Office,
            ZIP e afins (até 25 MB)
          </Typography>
        </Box>
        {can('opp.doc.upload') && (
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => {
              setNewTipo(docTypes.data?.[0]?.code ?? '');
              setError(null);
              setNewOpen(true);
            }}
          >
            Novo documento
          </Button>
        )}
      </Stack>

      {docs.isLoading && <LinearProgress sx={{ my: 2 }} />}
      {!docs.isLoading && items.length === 0 && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Nenhum documento no repositório ainda. Comece pelo termo de referência, edital ou pela
          proposta — cada novo envio do mesmo documento vira uma versão (v01, v02…).
        </Alert>
      )}

      <Stack spacing={2} sx={{ mt: 1.5 }}>
        {groups.map((g) => (
          <Box key={g.key}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
              <Typography variant="overline">{g.label}</Typography>
              <Chip size="small" label={g.docs.length} sx={{ height: 18, fontSize: 11 }} />
            </Stack>
            <Stack spacing={1}>
              {g.docs.map((doc) => {
                const isOpen = expanded === doc.id;
                return (
                  <Box key={doc.id} sx={{ border: `1px solid ${DS.border}`, borderRadius: 2, p: 1.25, bgcolor: 'background.paper' }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                      <Typography variant="body2" fontWeight={600}>
                        {doc.name}
                      </Typography>
                      <Chip size="small" label={vLabel(doc.currentVersion)} sx={{ bgcolor: DS.primarySoft, color: DS.ardosia, fontWeight: 700 }} />
                      <Chip
                        size="small"
                        label={STATUS_LABEL[doc.status]}
                        sx={{
                          bgcolor: doc.status === 'aprovado' ? STATE_SOFT.success.bg : doc.status === 'rejeitado' ? STATE_SOFT.error.bg : STATE_SOFT.warning.bg,
                          color: doc.status === 'aprovado' ? STATE_SOFT.success.color : doc.status === 'rejeitado' ? STATE_SOFT.error.color : STATE_SOFT.warning.color,
                        }}
                      />
                      <Box sx={{ flexGrow: 1 }} />
                      <Button size="small" startIcon={<DownloadIcon />} onClick={() => void download(doc.id, doc.currentVersion)}>
                        Baixar
                      </Button>
                      {can('opp.doc.upload') && (
                        <Button size="small" component="label" startIcon={<UploadFileIcon />} disabled={versioning === doc.id}>
                          Nova versão
                          <input
                            hidden
                            type="file"
                            accept={DOC_ACCEPT}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = '';
                              if (f) void sendVersion(doc, f);
                            }}
                          />
                        </Button>
                      )}
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
                      <Button size="small" onClick={() => setExpanded(isOpen ? null : doc.id)}>
                        {isOpen ? 'Ocultar versões' : 'Versões'}
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Incluído em {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                      {doc.creator?.fullName ? ` por ${doc.creator.fullName}` : ''}
                      {doc.category ? ` · checklist: ${doc.category}` : ''}
                    </Typography>
                    {isOpen && (
                      <Box sx={{ mt: 1, borderTop: `1px dashed ${DS.border}`, pt: 0.5 }}>
                        <DocVersionsList docId={doc.id} onDownload={(v) => void download(doc.id, v)} />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* Novo documento */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo documento</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField select label="Tipo de documento" value={newTipo} onChange={(e) => setNewTipo(e.target.value)}>
              {(docTypes.data ?? []).map((t) => (
                <MenuItem key={t.code} value={t.code}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
            <Button component="label" startIcon={<UploadFileIcon />} variant="outlined" sx={{ justifyContent: 'flex-start' }}>
              {file ? `${file.name} (${fmtBytes(file.size)})` : 'Escolher arquivo (PDF, Word, Excel, PPT, ZIP…)'}
              <input
                hidden
                type="file"
                accept={DOC_ACCEPT}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !newNome.trim()) setNewNome(f.name.replace(/\.[^.]+$/, ''));
                }}
              />
            </Button>
            <TextField
              label="Nome do documento"
              placeholder="ex.: Proposta Técnica"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
            />
            <TextField
              select
              label="Vincular a item do checklist (opcional)"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value="">Nenhum — documento do repositório</MenuItem>
              {pendingItems.map((i) => (
                <MenuItem key={i.id} value={i.id}>
                  {i.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              multiline
              minRows={2}
              label="Observações (opcional)"
              value={newObs}
              onChange={(e) => setNewObs(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!file || !newTipo || busy} onClick={() => void sendNew()}>
            Enviar (v01)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejeição RN-012 */}
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
    </Box>
  );
}

/* ── Linha do tempo ──────────────────────────────────────────────────────────
   História completa do projeto em um lugar só: marcos manuais (reuniões,
   envios, decisões — o que acontece fora do sistema) mesclados com os
   eventos automáticos da auditoria. Quem assume o projeto lê tudo aqui. */

const MILESTONE_TIPOS = [
  { value: 'reuniao', label: 'Reunião', Icon: GroupsOutlinedIcon },
  { value: 'envio', label: 'Envio', Icon: SendOutlinedIcon },
  { value: 'decisao', label: 'Decisão', Icon: GavelOutlinedIcon },
  { value: 'demanda', label: 'Demanda', Icon: CampaignOutlinedIcon },
  { value: 'entrega', label: 'Entrega', Icon: TaskAltOutlinedIcon },
  { value: 'marco', label: 'Marco', Icon: FlagOutlinedIcon },
] as const;
const tipoDef = (t: string) => MILESTONE_TIPOS.find((x) => x.value === t) ?? MILESTONE_TIPOS[5];

interface Milestone {
  id: number; occurredOn: string; tipo: string; titulo: string;
  descricao: string; createdBy: number | null; authorName: string;
}

function HistoryTab({ oppId }: { oppId: number }) {
  const { can, me } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [form, setForm] = useState({ occurredOn: '', tipo: 'reuniao', titulo: '', descricao: '' });
  const [error, setError] = useState<string | null>(null);

  const history = useQuery({
    queryKey: ['history', oppId],
    queryFn: () =>
      api.get<{
        transitions: Array<{ id: number; movedAt: string; justification: string | null }>;
        audit: Array<{ action: string; field: string | null; oldValue: string | null; newValue: string | null; occurredAt: string; actorName: string; entity: string }>;
        milestones: Milestone[];
      }>(`/opportunities/${oppId}/history`),
  });

  if (history.isLoading) return <LinearProgress />;
  const milestones = history.data?.milestones ?? [];
  const audit = history.data?.audit ?? [];

  // mescla cronológica (desc): marco ancora no fim do dia informado
  type Entry =
    | { kind: 'marco'; when: string; m: Milestone }
    | { kind: 'sistema'; when: string; a: (typeof audit)[number] };
  const entries: Entry[] = [
    ...milestones.map((m0): Entry => ({ kind: 'marco', when: `${m0.occurredOn}T23:59:59`, m: m0 })),
    ...audit.map((a): Entry => ({ kind: 'sistema', when: a.occurredAt, a })),
  ].sort((x, y) => (x.when < y.when ? 1 : -1));

  function openCreate() {
    setEditing(null);
    setForm({ occurredOn: new Date().toISOString().slice(0, 10), tipo: 'reuniao', titulo: '', descricao: '' });
    setError(null);
    setDialogOpen(true);
  }
  function openEdit(m0: Milestone) {
    setEditing(m0);
    setForm({ occurredOn: m0.occurredOn, tipo: m0.tipo, titulo: m0.titulo, descricao: m0.descricao });
    setError(null);
    setDialogOpen(true);
  }
  async function saveMilestone() {
    setError(null);
    try {
      if (editing) await api.patch(`/milestones/${editing.id}`, form);
      else await api.post(`/opportunities/${oppId}/milestones`, form);
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['history', oppId] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao salvar o marco.');
    }
  }
  async function removeMilestone(m0: Milestone) {
    await api.delete(`/milestones/${m0.id}`);
    await queryClient.invalidateQueries({ queryKey: ['history', oppId] });
  }

  const canMark = can('opp.comment') || can('opp.update');

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          Marcos registrados pela equipe + eventos automáticos do sistema, em ordem cronológica.
        </Typography>
        {canMark && (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
            Registrar marco
          </Button>
        )}
      </Stack>

      {entries.length === 0 && <Alert severity="info">Nada registrado ainda.</Alert>}

      <Box sx={{ position: 'relative', pl: 4.5, '&::before': { content: '""', position: 'absolute', left: 15, top: 6, bottom: 6, width: 2, bgcolor: DS.border } }}>
        <Stack spacing={1.25}>
          {entries.map((e, i) => {
            if (e.kind === 'marco') {
              const { label, Icon } = tipoDef(e.m.tipo);
              const own = me != null && e.m.createdBy === me.id;
              return (
                <Box key={`m-${e.m.id}`} sx={{ position: 'relative' }}>
                  <Box sx={{ position: 'absolute', left: -36, top: 2, width: 32, height: 32, borderRadius: '50%', bgcolor: DS.primarySoft, border: `2px solid ${DS.ciano}`, display: 'grid', placeItems: 'center' }}>
                    <Icon sx={{ fontSize: 16, color: DS.ardosia }} />
                  </Box>
                  <Box sx={{ border: `1px solid ${DS.border}`, borderRadius: 2, p: 1.5, bgcolor: 'background.paper' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2">{e.m.titulo}</Typography>
                      <Chip size="small" label={label} sx={{ bgcolor: DS.primarySoft, color: DS.ardosia }} />
                      <Box sx={{ flexGrow: 1 }} />
                      {(own || can('opp.update')) && (
                        <>
                          <IconButton size="small" onClick={() => openEdit(e.m)} aria-label="Editar marco">
                            <EditIcon fontSize="inherit" />
                          </IconButton>
                          <IconButton size="small" onClick={() => void removeMilestone(e.m)} aria-label="Remover marco">
                            <DeleteOutlineIcon fontSize="inherit" />
                          </IconButton>
                        </>
                      )}
                    </Stack>
                    {e.m.descricao && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                        {e.m.descricao}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {new Date(`${e.m.occurredOn}T12:00:00`).toLocaleDateString('pt-BR')} · {e.m.authorName}
                    </Typography>
                  </Box>
                </Box>
              );
            }
            const a = e.a;
            return (
              <Box key={`a-${i}`} sx={{ position: 'relative', py: 0.25 }}>
                <Box sx={{ position: 'absolute', left: -25, top: 8, width: 10, height: 10, borderRadius: '50%', bgcolor: DS.aco }} />
                <Typography variant="body2">
                  <b>{a.actorName}</b> {actionLabel(a.action)} {entityLabel(a.entity)}
                  {a.oldValue || a.newValue ? (
                    <Typography component="span" variant="body2" color="text.secondary">
                      {' '}
                      — {a.oldValue ?? '∅'} → {a.newValue ?? '∅'}
                    </Typography>
                  ) : null}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(a.occurredAt).toLocaleString('pt-BR')}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Editar marco' : 'Registrar marco'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={2}>
              <TextField
                type="date"
                label="Data"
                value={form.occurredOn}
                onChange={(e) => setForm((f) => ({ ...f, occurredOn: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 190 }}
              />
              <TextField
                select
                label="Tipo"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                sx={{ flexGrow: 1 }}
              >
                {MILESTONE_TIPOS.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Título"
              placeholder="ex.: SERPRO solicitou revisão do escopo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
            <TextField
              multiline
              minRows={2}
              label="Descrição (opcional)"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!form.titulo.trim() || !form.occurredOn} onClick={() => void saveMilestone()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
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
