/**
 * FAITH — camada de dados em MODO ECOSSISTEMA.
 *
 * Este módulo mantém a interface REST-like que as páginas consomem
 * (api.get('/opportunities/kanban') etc.), mas resolve tudo direto no
 * Supabase corporativo (PostgREST + Storage + GoTrue) — o mesmo padrão das
 * demais micro-apps (é o "shim" documentado na arquitetura do Tetelestai).
 *
 * A governança NÃO mora aqui: RN-001/002 (trigger opp_guard_stage_transition),
 * RN-013 (trigger de segregação), notificações e auditoria de transição são
 * SECURITY DEFINER no banco (migrations 0073/0074). Este arquivo só lê,
 * escreve linhas assinadas como o próprio usuário e traduz erros.
 *
 * A API NestJS (portal-oportunidades/backend) permanece como caminho oficial
 * para o deploy Kubernetes (docs/11); o dispatcher permite trocar de modo sem
 * tocar nas páginas.
 */
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/* ── identidade corrente (cache por sessão) ────────────────────────────────── */

interface MeRow {
  id: number;
  email: string;
  fullName: string;
  displayName: string | null;
  profile: string;
  permissions: string[];
}

let meCache: { uid: string; me: MeRow } | null = null;

async function me(): Promise<MeRow> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) throw new ApiError(401, 'Sessão corporativa ausente.');
  if (meCache?.uid === uid) return meCache.me;

  const { data: u, error } = await supabase
    .from('users')
    .select('id, email, full_name, display_name, profile_id, active, blocked, profiles(name)')
    .eq('auth_user_id', uid)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!u) throw new ApiError(403, 'Acesso não provisionado: sua conta corporativa não está cadastrada na base de usuários.');
  if (!u.active || u.blocked) throw new ApiError(403, 'Conta inativa ou bloqueada na base corporativa.');

  const { data: pp, error: e2 } = await supabase
    .from('profile_permissions')
    .select('permissions(code, active)')
    .eq('profile_id', u.profile_id);
  if (e2) throw new ApiError(500, e2.message);

  const permissions = (pp ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- embed PostgREST
    .map((r: any) => r.permissions)
    .filter((p): p is { code: string; active: boolean } => !!p && p.active && p.code.startsWith('opp.'))
    .map((p) => p.code);

  const meRow: MeRow = {
    id: Number(u.id),
    email: u.email,
    fullName: u.full_name,
    displayName: u.display_name,
    profile: (u.profiles as unknown as { name: string } | null)?.name ?? '—',
    permissions,
  };
  meCache = { uid, me: meRow };
  return meRow;
}

supabase.auth.onAuthStateChange(() => {
  meCache = null;
});

/* ── helpers ───────────────────────────────────────────────────────────────── */

function fail(error: { message: string; code?: string }, fallback = 500): never {
  const msg = error.message ?? 'Falha na operação';
  if (/RN-001/.test(msg)) throw new ApiError(409, msg);
  if (/RN-002|RN-013/.test(msg)) throw new ApiError(422, msg);
  if (error.code === '23505') throw new ApiError(409, 'Registro duplicado (violação de unicidade).');
  if (error.code === '42501' || /row-level security/.test(msg))
    throw new ApiError(403, 'Sem permissão para esta operação.');
  throw new ApiError(fallback, msg);
}

const num = (v: unknown) => (v == null ? null : Number(v));

interface StageRow { id: number; code: string; name: string; position: number; color: string | null; is_terminal: boolean; active: boolean }
const mapStage = (s: StageRow) => ({
  id: Number(s.id), code: s.code, name: s.name, position: s.position,
  color: s.color, isTerminal: s.is_terminal, active: s.active,
});

async function stages(all = false) {
  let q = supabase.from('opp_stages').select('*').order('position');
  if (!all) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) fail(error);
  return (data ?? []).map(mapStage);
}

/* eslint-disable @typescript-eslint/no-explicit-any -- linhas PostgREST dinâmicas */
function mapOpportunity(o: any) {
  return {
    id: Number(o.id), code: o.code, leadSource: o.lead_source,
    clientId: num(o.client_id), partnerId: num(o.partner_id),
    client: o.client ? {
      id: Number(o.client.id), name: o.client.name, orgao: o.client.orgao, cnpj: o.client.cnpj,
      municipio: o.client.municipio, uf: o.client.uf, contactName: o.client.contact_name,
      contactEmail: o.client.contact_email, contactPhone: o.client.contact_phone,
    } : undefined,
    partner: o.partner ? { id: Number(o.partner.id), name: o.partner.name, cnpj: o.partner.cnpj } : null,
    objeto: o.objeto, solucao: o.solucao,
    valorEstimado: num(o.valor_estimado), receitaPrevista: num(o.receita_prevista),
    probabilidade: o.probabilidade, complexidade: o.complexidade,
    situacaoComercial: o.situacao_comercial,
    stageId: Number(o.stage_id),
    stage: o.stage ? mapStage(o.stage) : undefined,
    status: o.status, closureReason: o.closure_reason,
    gestorXptoId: num(o.gestor_xpto_id), gestorSerproId: num(o.gestor_serpro_id),
    gestorXpto: o.gestor_xpto ? { id: Number(o.gestor_xpto.id), fullName: o.gestor_xpto.full_name } : undefined,
    gestorSerpro: o.gestor_serpro ? { id: Number(o.gestor_serpro.id), fullName: o.gestor_serpro.full_name } : null,
    expectedCloseDate: o.expected_close_date, prazoEstimado: o.prazo_estimado,
    observacoes: o.observacoes, createdBy: num(o.created_by),
    createdAt: o.created_at, updatedAt: o.updated_at,
  };
}

const OPP_SELECT = `*, client:opp_clients(*), partner:opp_partners(*), stage:opp_stages(*),
  gestor_xpto:users!opp_opportunities_gestor_xpto_id_fkey(id, full_name),
  gestor_serpro:users!opp_opportunities_gestor_serpro_id_fkey(id, full_name)`;

async function getOpportunity(id: number) {
  const { data, error } = await supabase.from('opp_opportunities').select(OPP_SELECT).eq('id', id).maybeSingle();
  if (error) fail(error);
  if (!data) throw new ApiError(404, 'Oportunidade não encontrada');
  return mapOpportunity(data);
}

async function audit(entries: Array<{ entity: string; entityId: number; opportunityId?: number | null; action: string; field?: string; oldValue?: unknown; newValue?: unknown }>) {
  if (!entries.length) return;
  const my = await me();
  await supabase.from('opp_audit_log').insert(
    entries.map((e) => ({
      entity: e.entity, entity_id: e.entityId, opportunity_id: e.opportunityId ?? null,
      action: e.action, field: e.field ?? null,
      old_value: e.oldValue == null ? null : String(e.oldValue),
      new_value: e.newValue == null ? null : String(e.newValue),
      actor_id: my.id,
    })),
  );
}

async function pendingItems(oppId: number, stageId: number) {
  const { data } = await supabase
    .from('opp_checklist_items')
    .select('id, name, status, required')
    .eq('opportunity_id', oppId).eq('stage_id', stageId).eq('required', true)
    .not('status', 'in', '("aprovado","dispensado")');
  return (data ?? []).map((i: any) => ({ checklistItemId: Number(i.id), name: i.name, status: i.status }));
}

/* ── operações de negócio ──────────────────────────────────────────────────── */

async function transition(oppId: number, toStageId: number, justification?: string) {
  const my = await me();
  const opp = await getOpportunity(oppId);
  if (opp.status !== 'aberta') throw new ApiError(409, 'Oportunidade encerrada não transiciona (RN-008)');
  const { error } = await supabase.from('opp_opportunities')
    .update({ stage_id: toStageId }).eq('id', oppId).select('id').single();
  if (error) {
    if (/RN-001/.test(error.message)) {
      const items = await pendingItems(oppId, opp.stageId);
      throw new ApiError(409, `Avanço bloqueado: ${items.length} documento(s) obrigatório(s) pendente(s) na etapa ${opp.stage?.name} (RN-001).`, { pendingItems: items });
    }
    fail(error);
  }
  await supabase.from('opp_stage_transitions').insert({
    opportunity_id: oppId, from_stage_id: opp.stageId, to_stage_id: toStageId,
    moved_by: my.id, justification: justification ?? null,
    snapshot: { valorEstimado: opp.valorEstimado, probabilidade: opp.probabilidade },
  });
  return getOpportunity(oppId);
}

async function close(oppId: number, outcome: string, justification: string) {
  const my = await me();
  const opp = await getOpportunity(oppId);
  const all = await stages(true);
  const terminal = all.find((s) => s.isTerminal);
  if (!terminal) throw new ApiError(409, 'Etapa terminal não configurada');
  const { error } = await supabase.from('opp_opportunities')
    .update({ stage_id: terminal.id, status: outcome, closure_reason: justification })
    .eq('id', oppId).select('id').single();
  if (error) fail(error);
  await supabase.from('opp_stage_transitions').insert({
    opportunity_id: oppId, from_stage_id: opp.stageId, to_stage_id: terminal.id,
    moved_by: my.id, justification, snapshot: { outcome, valorEstimado: opp.valorEstimado },
  });
  return getOpportunity(oppId);
}

async function createOpportunity(dto: any) {
  const my = await me();
  const first = (await stages()).find((s) => !s.isTerminal);
  if (!first) throw new ApiError(409, 'Nenhuma etapa ativa configurada');
  if (dto.leadSource === 'parceiro' && !dto.partnerId)
    throw new ApiError(422, 'Origem "parceiro" exige parceiro vinculado (RN-005)');
  const year = new Date().getFullYear();
  const { data: last } = await supabase.from('opp_opportunities')
    .select('code').like('code', `OPP-${year}-%`).order('code', { ascending: false }).limit(1);
  const seq = last?.length ? Number(last[0].code.split('-')[2]) + 1 : 1;
  const code = `OPP-${year}-${String(seq).padStart(4, '0')}`;

  const { data, error } = await supabase.from('opp_opportunities').insert({
    code, lead_source: dto.leadSource, client_id: dto.clientId, partner_id: dto.partnerId ?? null,
    objeto: dto.objeto, solucao: dto.solucao,
    valor_estimado: dto.valorEstimado ?? null, receita_prevista: dto.receitaPrevista ?? null,
    probabilidade: dto.probabilidade ?? null, complexidade: dto.complexidade ?? null,
    situacao_comercial: dto.situacaoComercial ?? null,
    stage_id: first.id, gestor_xpto_id: dto.gestorXptoId, gestor_serpro_id: dto.gestorSerproId ?? null,
    expected_close_date: dto.expectedCloseDate ?? null, prazo_estimado: dto.prazoEstimado ?? null,
    observacoes: dto.observacoes ?? null, created_by: my.id,
  }).select('id').single();
  if (error) fail(error);
  const id = Number(data.id);
  await supabase.from('opp_stage_transitions').insert({
    opportunity_id: id, from_stage_id: null, to_stage_id: first.id, moved_by: my.id,
    snapshot: { valorEstimado: dto.valorEstimado ?? null, probabilidade: dto.probabilidade ?? null },
  });
  await audit([{ entity: 'opportunity', entityId: id, opportunityId: id, action: 'create' }]);
  return getOpportunity(id);
}

const OPP_FIELD_MAP: Record<string, string> = {
  leadSource: 'lead_source', clientId: 'client_id', partnerId: 'partner_id', objeto: 'objeto',
  solucao: 'solucao', valorEstimado: 'valor_estimado', receitaPrevista: 'receita_prevista',
  probabilidade: 'probabilidade', complexidade: 'complexidade', situacaoComercial: 'situacao_comercial',
  gestorXptoId: 'gestor_xpto_id', gestorSerproId: 'gestor_serpro_id',
  expectedCloseDate: 'expected_close_date', prazoEstimado: 'prazo_estimado', observacoes: 'observacoes',
};

async function updateOpportunity(id: number, dto: any) {
  const before: any = await getOpportunity(id);
  const patch: Record<string, unknown> = {};
  const diffs: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  for (const [camel, col] of Object.entries(OPP_FIELD_MAP)) {
    if (!(camel in dto)) continue;
    patch[col] = dto[camel];
    if (String(before[camel] ?? '') !== String(dto[camel] ?? ''))
      diffs.push({ field: camel, oldValue: before[camel], newValue: dto[camel] });
  }
  const { error } = await supabase.from('opp_opportunities').update(patch).eq('id', id).select('id').single();
  if (error) fail(error);
  await audit(diffs.map((d) => ({ entity: 'opportunity', entityId: id, opportunityId: id, action: 'update', ...d })));
  return getOpportunity(id);
}

async function checklist(oppId: number) {
  const opp = await getOpportunity(oppId);
  const { data, error } = await supabase
    .from('opp_checklist_items')
    .select('id, stage_id, name, required, status, document_id, waived_reason, stage:opp_stages(name, position)')
    .eq('opportunity_id', oppId);
  if (error) fail(error);
  const items = (data ?? [])
    .map((i: any) => ({
      id: Number(i.id), stageId: Number(i.stage_id), stageName: i.stage?.name,
      stagePosition: i.stage?.position, name: i.name, required: i.required, status: i.status,
      documentId: num(i.document_id), waivedReason: i.waived_reason,
      isCurrentStage: Number(i.stage_id) === opp.stageId,
    }))
    .sort((a: any, b: any) => a.stagePosition - b.stagePosition || a.id - b.id);
  const current = items.filter((i: any) => i.isCurrentStage && i.required);
  const done = current.filter((i: any) => ['aprovado', 'dispensado'].includes(i.status));
  return {
    items,
    currentStage: {
      requiredTotal: current.length, requiredDone: done.length,
      percent: current.length === 0 ? 100 : Math.round((done.length / current.length) * 100),
      canAdvance: done.length === current.length,
    },
  };
}

async function kanban() {
  const [sts, opps, items] = await Promise.all([
    stages(),
    supabase.from('opp_opportunities')
      .select('id, code, valor_estimado, probabilidade, lead_source, expected_close_date, stage_id, updated_at, client:opp_clients(name)')
      .eq('status', 'aberta').order('updated_at', { ascending: false })
      .then(({ data, error }) => { if (error) fail(error); return data ?? []; }),
    supabase.from('opp_checklist_items')
      .select('opportunity_id, stage_id, required, status')
      .then(({ data, error }) => { if (error) fail(error); return data ?? []; }),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return sts.map((s) => {
    const cards = (opps as any[])
      .filter((o) => Number(o.stage_id) === s.id)
      .map((o) => {
        const mine = (items as any[]).filter(
          (i) => Number(i.opportunity_id) === Number(o.id) && Number(i.stage_id) === s.id && i.required,
        );
        const okCount = mine.filter((i) => ['aprovado', 'dispensado'].includes(i.status)).length;
        return {
          id: Number(o.id), code: o.code, clientName: o.client?.name ?? null,
          valorEstimado: num(o.valor_estimado), probabilidade: o.probabilidade,
          leadSource: o.lead_source, expectedCloseDate: o.expected_close_date,
          overdue: !!o.expected_close_date && o.expected_close_date < today,
          checklist: {
            requiredTotal: mine.length, requiredDone: okCount,
            percent: mine.length === 0 ? 100 : Math.round((okCount / mine.length) * 100),
          },
        };
      });
    return {
      stageId: s.id, code: s.code, name: s.name, color: s.color, position: s.position,
      isTerminal: s.isTerminal, count: cards.length,
      totalValue: cards.reduce((a, c) => a + (c.valorEstimado ?? 0), 0), cards,
    };
  });
}

/* ── pontos focais SERPRO ──────────────────────────────────────────────────── */

const FOCAL_SELECT = '*, coverage:opp_focal_point_coverage(id, uf, municipio)';

function mapFocalPoint(f: any) {
  return {
    id: Number(f.id), name: f.name, email: f.email, phone: f.phone,
    papel: f.papel, regiao: f.regiao == null ? null : Number(f.regiao),
    notes: f.notes, active: f.active,
    coverage: (f.coverage ?? [])
      .map((c: any) => ({ id: Number(c.id), uf: c.uf, municipio: c.municipio }))
      .sort((a: any, b: any) => a.uf.localeCompare(b.uf)),
  };
}

async function saveFocalCoverage(focalPointId: number, coverage: Array<{ uf: string; municipio?: string | null }>) {
  const del = await supabase.from('opp_focal_point_coverage').delete().eq('focal_point_id', focalPointId);
  if (del.error) fail(del.error);
  if (coverage.length) {
    const rows = coverage.map((c) => ({
      focal_point_id: focalPointId, uf: c.uf.toUpperCase(), municipio: c.municipio?.trim() || null,
    }));
    const ins = await supabase.from('opp_focal_point_coverage').insert(rows);
    if (ins.error) fail(ins.error);
  }
}

/* ── documentos (Storage + tabelas) ────────────────────────────────────────── */

const BUCKET = 'opp-documents';

function mapDoc(d: any) {
  return {
    id: Number(d.id), name: d.name, category: d.category, docType: d.doc_type,
    status: d.status, currentVersion: d.current_version,
    checklistItemId: num(d.checklist_item_id), opportunityId: num(d.opportunity_id),
    creator: d.creator ? { fullName: d.creator.full_name } : undefined, createdAt: d.created_at,
  };
}

async function uploadDocument(oppId: number, form: FormData) {
  const my = await me();
  const file = form.get('file') as File | null;
  if (!file) throw new ApiError(422, 'Arquivo obrigatório');
  if (file.size > 25 * 1024 * 1024) throw new ApiError(422, 'Arquivo excede 25 MB (RN-011)');
  const name = String(form.get('name') ?? file.name);
  const checklistItemId = form.get('checklistItemId') ? Number(form.get('checklistItemId')) : null;

  const { data: doc, error } = await supabase.from('opp_documents').insert({
    opportunity_id: oppId, checklist_item_id: checklistItemId, name,
    category: (form.get('category') as string) || null, doc_type: (form.get('docType') as string) || null,
    status: 'em_analise', current_version: 1,
    notes: (form.get('observacoes') as string) || null, created_by: my.id,
  }).select('id').single();
  if (error) fail(error);
  const docId = Number(doc.id);

  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
  const path = `opp-${oppId}/doc-${docId}/v1-${crypto.randomUUID()}${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
  if (upErr) throw new ApiError(500, `Falha ao armazenar o arquivo: ${upErr.message}`);

  const { error: verErr } = await supabase.from('opp_document_versions').insert({
    document_id: docId, version: 1, file_name: file.name, mime_type: file.type || null,
    size_bytes: file.size, storage_path: path,
    observacoes: (form.get('observacoes') as string) || null, uploaded_by: my.id,
  });
  if (verErr) fail(verErr);

  if (checklistItemId) {
    await supabase.from('opp_checklist_items')
      .update({ document_id: docId, status: 'em_analise' }).eq('id', checklistItemId);
  }
  await audit([{ entity: 'document', entityId: docId, opportunityId: oppId, action: 'upload', newValue: file.name }]);
  return mapDoc({ id: docId, name, status: 'em_analise', current_version: 1 });
}

/** Nova versão de um documento existente (GED): incrementa e volta à análise. */
async function uploadDocumentVersion(docId: number, form: FormData) {
  const my = await me();
  const file = form.get('file') as File | null;
  if (!file) throw new ApiError(422, 'Arquivo obrigatório');
  if (file.size > 25 * 1024 * 1024) throw new ApiError(422, 'Arquivo excede 25 MB (RN-011)');

  const { data: doc, error } = await supabase.from('opp_documents')
    .select('id, opportunity_id, current_version, checklist_item_id, name')
    .eq('id', docId).single();
  if (error) fail(error);
  const oppId = Number(doc.opportunity_id);
  const version = Number(doc.current_version) + 1;

  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
  const path = `opp-${oppId}/doc-${docId}/v${version}-${crypto.randomUUID()}${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
  if (upErr) throw new ApiError(500, `Falha ao armazenar o arquivo: ${upErr.message}`);

  const { error: verErr } = await supabase.from('opp_document_versions').insert({
    document_id: docId, version, file_name: file.name, mime_type: file.type || null,
    size_bytes: file.size, storage_path: path,
    observacoes: (form.get('observacoes') as string) || null, uploaded_by: my.id,
  });
  if (verErr) fail(verErr);

  // nova versão volta à análise (e reflete no item de checklist, se houver)
  const { error: updErr } = await supabase.from('opp_documents')
    .update({ current_version: version, status: 'em_analise' }).eq('id', docId);
  if (updErr) fail(updErr);
  if (doc.checklist_item_id) {
    await supabase.from('opp_checklist_items')
      .update({ status: 'em_analise' }).eq('id', Number(doc.checklist_item_id));
  }
  await audit([{
    entity: 'document', entityId: docId, opportunityId: oppId,
    action: 'upload', field: 'version', oldValue: doc.current_version, newValue: version,
  }]);
  return { id: docId, version };
}

async function reviewDocument(docId: number, action: 'aprovado' | 'rejeitado', justification?: string) {
  const my = await me();
  if (action === 'rejeitado' && !justification)
    throw new ApiError(422, 'Rejeição exige justificativa (RN-012)');
  const { data: doc, error } = await supabase.from('opp_documents')
    .select('id, status, current_version, checklist_item_id, opportunity_id, name').eq('id', docId).single();
  if (error) fail(error);
  if (doc.status !== 'em_analise') throw new ApiError(409, `Documento não está em análise (status: ${doc.status})`);

  const { error: revErr } = await supabase.from('opp_document_reviews').insert({
    document_id: docId, version: doc.current_version, action,
    justification: justification ?? null, reviewed_by: my.id,
  });
  if (revErr) {
    if (/RN-013/.test(revErr.message))
      throw new ApiError(403, 'O aprovador não pode ser o autor do upload (RN-013)');
    fail(revErr);
  }
  await supabase.from('opp_documents').update({ status: action }).eq('id', docId);
  if (doc.checklist_item_id) {
    await supabase.from('opp_checklist_items').update({ status: action }).eq('id', doc.checklist_item_id);
  }
  await audit([{
    entity: 'document', entityId: docId, opportunityId: Number(doc.opportunity_id),
    action: action === 'aprovado' ? 'approve' : 'reject', field: 'version', newValue: doc.current_version,
  }]);
  return mapDoc({ ...doc, status: action });
}

async function downloadDocument(docId: number, version: number) {
  const { data: ver, error } = await supabase.from('opp_document_versions')
    .select('storage_path, file_name, document_id, opp_documents(opportunity_id)')
    .eq('document_id', docId).eq('version', version).single();
  if (error) fail(error);
  const { data: signed, error: sErr } = await supabase.storage.from(BUCKET)
    .createSignedUrl(ver.storage_path, 300);
  if (sErr) throw new ApiError(500, `Falha ao gerar URL de download: ${sErr.message}`);
  await audit([{
    entity: 'document', entityId: docId,
    opportunityId: num((ver as any).opp_documents?.opportunity_id),
    action: 'download', field: 'version', newValue: version,
  }]);
  return { url: signed.signedUrl, fileName: ver.file_name, expiresInSeconds: 300 };
}

/* ── dashboard (agregação no cliente, mesmos números do banco) ─────────────── */

async function dashboardData(params: URLSearchParams) {
  let q = supabase.from('opp_opportunities')
    .select('id, valor_estimado, probabilidade, status, stage_id, lead_source, expected_close_date, partner_id, gestor_xpto_id, created_at, client:opp_clients(uf)');
  const from = params.get('from'), to = params.get('to'), src = params.get('leadSource'), uf = params.get('uf');
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  if (src) q = q.eq('lead_source', src);
  const { data, error } = await q;
  if (error) fail(error);
  let rows = (data ?? []) as any[];
  if (uf) rows = rows.filter((r) => r.client?.uf === uf);
  return rows;
}

const dash = {
  async summary(p: URLSearchParams) {
    const rows = await dashboardData(p);
    const open = rows.filter((r) => r.status === 'aberta');
    const closed = rows.filter((r) => r.status !== 'aberta');
    const won = closed.filter((r) => r.status === 'ganha');
    const today = new Date().toISOString().slice(0, 10);
    return {
      pipelineTotal: open.reduce((a, r) => a + Number(r.valor_estimado ?? 0), 0),
      totalOpportunities: rows.length, open: open.length, won: won.length,
      conversionRate: closed.length ? Number((won.length / closed.length).toFixed(4)) : null,
      overdue: open.filter((r) => r.expected_close_date && r.expected_close_date < today).length,
      weightedForecast: open.reduce((a, r) => a + Number(r.valor_estimado ?? 0) * (r.probabilidade ?? 0) / 100, 0),
    };
  },
  async byStage(p: URLSearchParams) {
    const [rows, sts] = await Promise.all([dashboardData(p), stages()]);
    const open = rows.filter((r) => r.status === 'aberta');
    return sts.filter((s) => !s.isTerminal).map((s) => ({
      stageId: s.id, name: s.name, position: s.position,
      count: open.filter((r) => Number(r.stage_id) === s.id).length,
      totalValue: open.filter((r) => Number(r.stage_id) === s.id)
        .reduce((a, r) => a + Number(r.valor_estimado ?? 0), 0),
    }));
  },
  async bySource(p: URLSearchParams) {
    const rows = await dashboardData(p);
    return ['xpto', 'parceiro', 'serpro'].map((source) => ({
      source,
      count: rows.filter((r) => r.lead_source === source).length,
      totalValue: rows.filter((r) => r.lead_source === source)
        .reduce((a, r) => a + Number(r.valor_estimado ?? 0), 0),
    })).filter((r) => r.count > 0);
  },
  async durations() {
    const { data, error } = await supabase.from('opp_stage_transitions')
      .select('opportunity_id, from_stage_id, moved_at').order('moved_at');
    if (error) fail(error);
    const byOpp = new Map<number, any[]>();
    for (const t of data ?? []) {
      const k = Number(t.opportunity_id);
      if (!byOpp.has(k)) byOpp.set(k, []);
      byOpp.get(k)!.push(t);
    }
    const spans = new Map<number, number[]>();
    for (const ts of byOpp.values())
      for (let i = 1; i < ts.length; i++) {
        const sid = Number(ts[i].from_stage_id);
        if (!sid) continue;
        const days = (new Date(ts[i].moved_at).getTime() - new Date(ts[i - 1].moved_at).getTime()) / 86400000;
        if (!spans.has(sid)) spans.set(sid, []);
        spans.get(sid)!.push(days);
      }
    const sts = await stages();
    return sts.filter((s) => spans.has(s.id)).map((s) => {
      const arr = spans.get(s.id)!;
      return { stageId: s.id, name: s.name, position: s.position,
               avgDays: Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) };
    });
  },
  async partners(p: URLSearchParams) {
    const rows = (await dashboardData(p)).filter((r) => r.partner_id);
    const { data: parts } = await supabase.from('opp_partners').select('id, name');
    return (parts ?? []).map((pt: any) => {
      const mine = rows.filter((r) => Number(r.partner_id) === Number(pt.id));
      return {
        id: Number(pt.id), name: pt.name, opportunities: mine.length,
        pipeline: mine.filter((r) => r.status === 'aberta').reduce((a, r) => a + Number(r.valor_estimado ?? 0), 0),
        won: mine.filter((r) => r.status === 'ganha').length,
        wonValue: mine.filter((r) => r.status === 'ganha').reduce((a, r) => a + Number(r.valor_estimado ?? 0), 0),
      };
    }).filter((r) => r.opportunities > 0)
      .sort((a, b) => b.wonValue - a.wonValue || b.pipeline - a.pipeline).slice(0, 20);
  },
  async managers(p: URLSearchParams) {
    const rows = await dashboardData(p);
    const ids = [...new Set(rows.map((r) => Number(r.gestor_xpto_id)))];
    if (!ids.length) return [];
    const { data: us } = await supabase.from('users').select('id, full_name').in('id', ids);
    return (us ?? []).map((u: any) => {
      const mine = rows.filter((r) => Number(r.gestor_xpto_id) === Number(u.id));
      const closed = mine.filter((r) => r.status !== 'aberta');
      const won = mine.filter((r) => r.status === 'ganha');
      return {
        id: Number(u.id), name: u.full_name, opportunities: mine.length,
        pipeline: mine.filter((r) => r.status === 'aberta').reduce((a, r) => a + Number(r.valor_estimado ?? 0), 0),
        won: won.length,
        conversionRate: closed.length ? Number((won.length / closed.length).toFixed(4)) : null,
      };
    }).sort((a, b) => b.won - a.won || b.pipeline - a.pipeline).slice(0, 20);
  },
};

/* ── dispatcher REST-like ──────────────────────────────────────────────────── */

async function dispatch(method: string, path: string, body?: any, form?: FormData): Promise<any> {
  const url = new URL(path, 'http://faith.local');
  const p = url.pathname;
  const qp = url.searchParams;
  const m = (re: RegExp) => p.match(re);
  let x: RegExpMatchArray | null;

  if (method === 'GET') {
    if (p === '/me') return me();

    if (p === '/users') {
      const s = qp.get('search') ?? '';
      const { data, error } = await supabase.from('users')
        .select('id, full_name, email').eq('active', true).eq('blocked', false)
        .or(`full_name.ilike.%${s}%,email.ilike.%${s}%`).order('full_name').limit(20);
      if (error) fail(error);
      return (data ?? []).map((u: any) => ({ id: Number(u.id), fullName: u.full_name, email: u.email }));
    }

    if (p === '/stages') return stages(qp.get('all') === 'true');
    if ((x = m(/^\/stages\/(\d+)\/checklist-templates$/))) {
      const { data, error } = await supabase.from('opp_checklist_templates')
        .select('*').eq('stage_id', Number(x[1])).order('position');
      if (error) fail(error);
      return (data ?? []).map((t: any) => ({
        id: Number(t.id), stageId: Number(t.stage_id), name: t.name, description: t.description,
        docCategory: t.doc_category, required: t.required, position: t.position, active: t.active,
      }));
    }

    if (p === '/clients' || p === '/partners') {
      const table = p === '/clients' ? 'opp_clients' : 'opp_partners';
      let q = supabase.from(table).select('*', { count: 'exact' }).eq('active', true).order('name');
      const s = qp.get('search');
      if (s) q = p === '/clients' ? q.or(`name.ilike.%${s}%,orgao.ilike.%${s}%`) : q.ilike('name', `%${s}%`);
      const size = Number(qp.get('pageSize') ?? 20);
      const { data, count, error } = await q.limit(size);
      if (error) fail(error);
      const items = (data ?? []).map((c: any) => ({
        id: Number(c.id), name: c.name, orgao: c.orgao, cnpj: c.cnpj, municipio: c.municipio,
        uf: c.uf, contactName: c.contact_name, contactEmail: c.contact_email, contactPhone: c.contact_phone,
      }));
      return { items, total: count ?? items.length, page: 1, pageSize: size };
    }

    if (p === '/opportunities') {
      let q = supabase.from('opp_opportunities').select(OPP_SELECT, { count: 'exact' });
      if (qp.get('status')) q = q.eq('status', qp.get('status')!);
      const size = Number(qp.get('pageSize') ?? 20);
      const { data, count, error } = await q.order('updated_at', { ascending: false }).limit(size);
      if (error) fail(error);
      return { items: (data ?? []).map(mapOpportunity), total: count ?? 0, page: 1, pageSize: size };
    }
    if (p === '/opportunities/kanban') return kanban();
    if ((x = m(/^\/opportunities\/(\d+)$/))) return getOpportunity(Number(x[1]));
    if ((x = m(/^\/opportunities\/(\d+)\/checklist$/))) return checklist(Number(x[1]));

    if ((x = m(/^\/opportunities\/(\d+)\/documents$/))) {
      const { data, error } = await supabase.from('opp_documents')
        .select('*, creator:users!opp_documents_created_by_fkey(full_name)')
        .eq('opportunity_id', Number(x[1])).order('created_at', { ascending: false });
      if (error) fail(error);
      return (data ?? []).map(mapDoc);
    }
    if ((x = m(/^\/documents\/(\d+)\/versions\/(\d+)\/download$/)))
      return downloadDocument(Number(x[1]), Number(x[2]));

    if (p === '/doc-types') {
      const { data, error } = await supabase.from('opp_doc_types')
        .select('*').eq('active', true).order('position');
      if (error) fail(error);
      return (data ?? []).map((t: any) => ({
        id: Number(t.id), code: t.code, name: t.name, position: t.position,
      }));
    }
    if ((x = m(/^\/documents\/(\d+)\/versions$/))) {
      const { data, error } = await supabase.from('opp_document_versions')
        .select('version, file_name, mime_type, size_bytes, observacoes, uploaded_at, uploader:users(full_name)')
        .eq('document_id', Number(x[1])).order('version', { ascending: false });
      if (error) fail(error);
      return (data ?? []).map((v: any) => ({
        version: Number(v.version), fileName: v.file_name, mimeType: v.mime_type,
        sizeBytes: v.size_bytes == null ? null : Number(v.size_bytes),
        observacoes: v.observacoes, uploadedAt: v.uploaded_at,
        uploaderName: v.uploader?.full_name ?? '—',
      }));
    }

    if ((x = m(/^\/opportunities\/(\d+)\/history$/))) {
      const oppId = Number(x[1]);
      const [tr, au, ms] = await Promise.all([
        supabase.from('opp_stage_transitions').select('*').eq('opportunity_id', oppId)
          .order('moved_at', { ascending: false }),
        supabase.from('opp_audit_log')
          .select('action, field, old_value, new_value, occurred_at, actor:users(full_name), entity')
          .eq('opportunity_id', oppId).order('occurred_at', { ascending: false }).limit(500),
        supabase.from('opp_milestones')
          .select('id, occurred_on, tipo, titulo, descricao, created_by, author:users(full_name)')
          .eq('opportunity_id', oppId).order('occurred_on', { ascending: false }).order('id', { ascending: false }),
      ]);
      if (tr.error) fail(tr.error);
      if (ms.error) fail(ms.error);
      return {
        transitions: (tr.data ?? []).map((t: any) => ({
          id: Number(t.id), movedAt: t.moved_at, justification: t.justification,
        })),
        audit: (au.data ?? []).map((a: any) => ({
          action: a.action, field: a.field, oldValue: a.old_value, newValue: a.new_value,
          occurredAt: a.occurred_at, actorName: a.actor?.full_name ?? '—', entity: a.entity,
        })),
        milestones: (ms.data ?? []).map((m0: any) => ({
          id: Number(m0.id), occurredOn: m0.occurred_on, tipo: m0.tipo, titulo: m0.titulo,
          descricao: m0.descricao, createdBy: num(m0.created_by),
          authorName: m0.author?.full_name ?? '—',
        })),
      };
    }

    if ((x = m(/^\/opportunities\/(\d+)\/maturity$/))) {
      const oppId = Number(x[1]);
      const [ph, st] = await Promise.all([
        supabase.from('opp_maturity_phases').select('*').eq('active', true).order('position'),
        supabase.from('opp_maturity_states')
          .select('*, editor:users(full_name)').eq('opportunity_id', oppId),
      ]);
      if (ph.error) fail(ph.error);
      if (st.error) fail(st.error);
      const byPhase = new Map((st.data ?? []).map((s: any) => [Number(s.phase_id), s]));
      return (ph.data ?? []).map((f: any) => {
        const s = byPhase.get(Number(f.id));
        return {
          phaseId: Number(f.id), code: f.code, name: f.name, position: f.position,
          status: s?.status ?? 'pendente',
          startedOn: s?.started_on ?? null, completedOn: s?.completed_on ?? null,
          responsavel: s?.responsavel ?? '', nota: s?.nota ?? '',
          updatedAt: s?.updated_at ?? null,
          updatedByName: s?.editor?.full_name ?? null,
        };
      });
    }

    if ((x = m(/^\/opportunities\/(\d+)\/tech-spec$/))) {
      const oppId = Number(x[1]);
      const [sp, it] = await Promise.all([
        supabase.from('opp_tech_specs')
          .select('descricao, updated_at, editor:users(full_name)')
          .eq('opportunity_id', oppId).maybeSingle(),
        supabase.from('opp_tech_spec_items').select('*')
          .eq('opportunity_id', oppId)
          .order('categoria').order('ordem').order('id'),
      ]);
      if (sp.error) fail(sp.error);
      if (it.error) fail(it.error);
      return {
        descricao: sp.data?.descricao ?? '',
        updatedAt: sp.data?.updated_at ?? null,
        updatedByName: (sp.data as any)?.editor?.full_name ?? null,
        items: (it.data ?? []).map((i: any) => ({
          id: Number(i.id), categoria: i.categoria, item: i.item,
          quantidade: i.quantidade == null ? null : Number(i.quantidade),
          unidade: i.unidade, detalhe: i.detalhe, status: i.status, ordem: i.ordem,
        })),
      };
    }

    if ((x = m(/^\/opportunities\/(\d+)\/comments$/))) {
      const { data, error } = await supabase.from('opp_comments')
        .select('id, body, created_at, author:users(full_name)')
        .eq('opportunity_id', Number(x[1])).is('deleted_at', null).order('created_at');
      if (error) fail(error);
      return (data ?? []).map((c: any) => ({
        id: Number(c.id), body: c.body, createdAt: c.created_at,
        author: c.author ? { fullName: c.author.full_name } : undefined,
      }));
    }

    if (p === '/notifications') {
      let q = supabase.from('opp_notifications').select('*').order('created_at', { ascending: false }).limit(100);
      if (qp.get('unread') === 'true') q = q.is('read_at', null);
      const { data, error } = await q;
      if (error) fail(error);
      return (data ?? []).map((n: any) => ({
        id: Number(n.id), type: n.type, title: n.title, body: n.body,
        opportunityId: num(n.opportunity_id), readAt: n.read_at, createdAt: n.created_at,
      }));
    }

    // Última atividade por oportunidade (auditoria) — base dos alertas de
    // "projeto parado" no Kanban e no Dashboard.
    if (p === '/activity/last') {
      const { data, error } = await supabase.from('opp_audit_log')
        .select('opportunity_id, occurred_at')
        .not('opportunity_id', 'is', null)
        .order('occurred_at', { ascending: false })
        .limit(2000);
      if (error) fail(error);
      const map: Record<string, string> = {};
      for (const r of (data ?? []) as Array<{ opportunity_id: number; occurred_at: string }>) {
        const id = String(r.opportunity_id);
        if (!(id in map)) map[id] = r.occurred_at;
      }
      return map;
    }

    if (p === '/audit') {
      let q = supabase.from('opp_audit_log').select('*, actor:users(full_name)', { count: 'exact' });
      if (qp.get('entity')) q = q.eq('entity', qp.get('entity')!);
      if (qp.get('action')) q = q.eq('action', qp.get('action')!);
      if (qp.get('opportunityId')) q = q.eq('opportunity_id', Number(qp.get('opportunityId')));
      if (qp.get('from')) q = q.gte('occurred_at', `${qp.get('from')}T00:00:00`);
      if (qp.get('to')) q = q.lte('occurred_at', `${qp.get('to')}T23:59:59.999`);
      const size = Number(qp.get('pageSize') ?? 20);
      const page = Math.max(1, Number(qp.get('page') ?? 1));
      const from = (page - 1) * size;
      const { data, count, error } = await q
        .order('occurred_at', { ascending: false })
        .range(from, from + size - 1);
      if (error) fail(error);
      return {
        items: (data ?? []).map((a: any) => ({
          id: Number(a.id), entity: a.entity, entityId: Number(a.entity_id),
          opportunityId: num(a.opportunity_id), action: a.action, field: a.field,
          oldValue: a.old_value, newValue: a.new_value, actorId: Number(a.actor_id),
          actorName: a.actor?.full_name ?? null,
          occurredAt: a.occurred_at,
        })),
        total: count ?? 0, page, pageSize: size,
      };
    }

    if (p === '/focal-points') {
      let q = supabase.from('opp_focal_points').select(FOCAL_SELECT);
      if (qp.get('all') !== 'true') q = q.eq('active', true);
      const s = qp.get('search');
      if (s) q = q.ilike('name', `%${s}%`);
      const { data, error } = await q.order('name');
      if (error) fail(error);
      let items = (data ?? []).map(mapFocalPoint);
      const uf = qp.get('uf');
      if (uf) items = items.filter((fp) => fp.coverage.some((c: any) => c.uf === uf));
      return items;
    }
    if ((x = m(/^\/opportunities\/(\d+)\/focal-points$/))) {
      const { data, error } = await supabase.from('opp_opportunity_focal_points')
        .select(`id, principal, auto_assigned, assigned_at, focalPoint:opp_focal_points(${FOCAL_SELECT})`)
        .eq('opportunity_id', Number(x[1]))
        .order('principal', { ascending: false }).order('assigned_at');
      if (error) fail(error);
      return (data ?? []).map((l: any) => ({
        id: Number(l.id), principal: l.principal, autoAssigned: l.auto_assigned,
        assignedAt: l.assigned_at, focalPoint: mapFocalPoint(l.focalPoint),
      }));
    }

    if (p === '/radar') {
      let q = supabase.from('opp_radar')
        .select('*, pipeline:opp_opportunities(id, code, status, stage:opp_stages(name, color))');
      if (qp.get('esfera')) q = q.eq('esfera', qp.get('esfera')!);
      if (qp.get('uf')) q = q.eq('uf', qp.get('uf')!);
      const s = qp.get('search');
      if (s) q = q.or(`objeto.ilike.%${s}%,orgao_responsavel.ilike.%${s}%,pais.ilike.%${s}%,cidade.ilike.%${s}%`);
      const { data, error } = await q.order('id');
      if (error) fail(error);
      return (data ?? []).map((r: any) => ({
        ...r,
        id: Number(r.id),
        opportunity_id: num(r.opportunity_id),
        pipeline: r.pipeline
          ? { id: Number(r.pipeline.id), code: r.pipeline.code, status: r.pipeline.status, stage: r.pipeline.stage }
          : null,
      }));
    }

    if (p === '/dashboard/summary') return dash.summary(qp);
    if (p === '/dashboard/by-stage') return dash.byStage(qp);
    if (p === '/dashboard/by-source') return dash.bySource(qp);
    if (p === '/dashboard/stage-durations') return dash.durations();
    if (p === '/dashboard/rankings/partners') return dash.partners(qp);
    if (p === '/dashboard/rankings/managers') return dash.managers(qp);
  }

  if (method === 'POST') {
    if (p === '/opportunities') return createOpportunity(body);
    if ((x = m(/^\/opportunities\/(\d+)\/transition$/)))
      return transition(Number(x[1]), body.toStageId, body.justification);
    if ((x = m(/^\/opportunities\/(\d+)\/close$/)))
      return close(Number(x[1]), body.outcome, body.justification);
    if ((x = m(/^\/opportunities\/(\d+)\/comments$/))) {
      const my = await me();
      const { data, error } = await supabase.from('opp_comments')
        .insert({ opportunity_id: Number(x[1]), author_id: my.id, body: body.body })
        .select('id, body, created_at').single();
      if (error) fail(error);
      await audit([{ entity: 'comment', entityId: Number(data.id), opportunityId: Number(x[1]), action: 'create' }]);
      return { id: Number(data.id), body: data.body, createdAt: data.created_at };
    }
    if ((x = m(/^\/opportunities\/(\d+)\/documents$/)) && form) return uploadDocument(Number(x[1]), form);
    if ((x = m(/^\/documents\/(\d+)\/versions$/)) && form) return uploadDocumentVersion(Number(x[1]), form);
    if ((x = m(/^\/documents\/(\d+)\/approve$/))) return reviewDocument(Number(x[1]), 'aprovado');
    if ((x = m(/^\/documents\/(\d+)\/reject$/))) return reviewDocument(Number(x[1]), 'rejeitado', body.justification);

    if (p === '/clients') {
      const my = await me();
      const { data, error } = await supabase.from('opp_clients').insert({
        name: body.name, orgao: body.orgao ?? null, cnpj: body.cnpj?.replace(/\D/g, '') || null,
        municipio: body.municipio ?? null, uf: body.uf ?? null, contact_name: body.contactName ?? null,
        contact_email: body.contactEmail ?? null, contact_phone: body.contactPhone ?? null,
        notes: body.notes ?? null, created_by: my.id,
      }).select('id').single();
      if (error) fail(error);
      await audit([{ entity: 'client', entityId: Number(data.id), action: 'create' }]);
      return { id: Number(data.id), ...body };
    }
    if (p === '/partners') {
      const my = await me();
      const { data, error } = await supabase.from('opp_partners').insert({
        name: body.name, cnpj: body.cnpj?.replace(/\D/g, '') || null, contact_name: body.contactName ?? null,
        contact_email: body.contactEmail ?? null, contact_phone: body.contactPhone ?? null, created_by: my.id,
      }).select('id').single();
      if (error) fail(error);
      await audit([{ entity: 'partner', entityId: Number(data.id), action: 'create' }]);
      return { id: Number(data.id), ...body };
    }

    if ((x = m(/^\/radar\/(\d+)\/promote$/))) {
      // Promove um registro do radar à esteira de governança, reaproveitando
      // ou criando o cliente (órgão) e o parceiro. Idempotente: já promovido
      // devolve a oportunidade existente.
      const my = await me();
      const { data: r, error: re } = await supabase.from('opp_radar').select('*').eq('id', Number(x[1])).single();
      if (re) fail(re);
      if (r.opportunity_id) return getOpportunity(Number(r.opportunity_id));

      const informado = (v: string | null) => v && v !== 'Não informado' && v !== 'N/A' ? v : null;
      const clientName = informado(r.orgao_responsavel)
        ?? `A definir — ${informado(r.cidade) ?? informado(r.uf) ?? r.pais}`;

      // Cliente (órgão): reaproveita por nome (+ UF quando houver)
      let clientQ = supabase.from('opp_clients').select('id').ilike('name', clientName).limit(1);
      if (informado(r.uf)) clientQ = clientQ.eq('uf', r.uf);
      const { data: found } = await clientQ;
      let clientId = found?.length ? Number(found[0].id) : null;
      if (!clientId) {
        const { data: c, error: ce } = await supabase.from('opp_clients').insert({
          name: clientName, orgao: informado(r.orgao_responsavel),
          municipio: informado(r.cidade), uf: informado(r.uf),
          notes: `Origem: Radar de Oportunidades #${r.id} (${r.abrangencia} · ${r.esfera} · ${r.pais})`,
          created_by: my.id,
        }).select('id').single();
        if (ce) fail(ce);
        clientId = Number(c.id);
        await audit([{ entity: 'client', entityId: clientId, action: 'create' }]);
      }

      // Parceiro: reaproveita por nome quando parceiro = Sim
      let partnerId: number | null = null;
      if (r.parceiro === 'Sim' && informado(r.nome_parceiro)) {
        const { data: pf } = await supabase.from('opp_partners').select('id')
          .ilike('name', r.nome_parceiro).limit(1);
        partnerId = pf?.length ? Number(pf[0].id) : null;
        if (!partnerId) {
          const { data: np, error: pe } = await supabase.from('opp_partners').insert({
            name: r.nome_parceiro, created_by: my.id,
          }).select('id').single();
          if (pe) fail(pe);
          partnerId = Number(np.id);
          await audit([{ entity: 'partner', entityId: partnerId, action: 'create' }]);
        }
      }

      const leadSource = String(r.hunter).toUpperCase() === 'SERPRO' ? 'serpro' : partnerId ? 'parceiro' : 'xpto';
      const valor = ((): number | null => {
        const d = String(r.valor_estimado_total_contrato).replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.');
        const v = Number(d);
        return d && Number.isFinite(v) && v > 0 ? v : null;
      })();

      const opp: any = await createOpportunity({
        leadSource, clientId, partnerId,
        objeto: r.objeto,
        solucao: r.objeto,
        valorEstimado: valor,
        prazoEstimado: informado(r.tempo_contrato),
        situacaoComercial: 'Promovida do Radar de Oportunidades',
        observacoes: `Radar #${r.id} · ${r.abrangencia} · ${r.esfera} · ` +
          `${informado(r.cidade) ? r.cidade + '/' : ''}${informado(r.uf) ?? r.pais}` +
          `${informado(r.responsavel_serpro) ? ' · Responsável SERPRO: ' + r.responsavel_serpro : ''}`,
        gestorXptoId: my.id,
      });

      const { error: ue } = await supabase.from('opp_radar')
        .update({ opportunity_id: opp.id }).eq('id', Number(x[1]));
      if (ue) fail(ue);
      return opp;
    }

    if (p === '/radar') {
      const my = await me();
      // As regras de modelagem (R3–R9) são normalizadas pelo trigger do banco.
      const { data, error } = await supabase.from('opp_radar').insert({
        abrangencia: body.abrangencia, esfera: body.esfera, pais: body.pais,
        uf: body.uf, cidade: body.cidade, objeto: body.objeto,
        orgao_responsavel: body.orgao_responsavel, valor_estimado_total_contrato: body.valor_estimado_total_contrato,
        periodo: body.periodo, tempo_contrato: body.tempo_contrato,
        responsavel_serpro: body.responsavel_serpro, hunter: body.hunter,
        parceiro: body.parceiro, nome_parceiro: body.nome_parceiro,
        created_by: my.id,
      }).select('*').single();
      if (error) fail(error);
      return { ...data, id: Number(data.id) };
    }

    if (p === '/focal-points') {
      const my = await me();
      const { data, error } = await supabase.from('opp_focal_points').insert({
        name: body.name, email: body.email?.trim() || null, phone: body.phone?.trim() || null,
        papel: body.papel ?? 'outro', regiao: body.regiao ?? null, notes: body.notes ?? null,
        created_by: my.id,
      }).select('id').single();
      if (error) fail(error);
      const fpId = Number(data.id);
      if (Array.isArray(body.coverage)) await saveFocalCoverage(fpId, body.coverage);
      await audit([{ entity: 'focal_point', entityId: fpId, action: 'create', newValue: body.name }]);
      return { id: fpId, ...body };
    }
    if ((x = m(/^\/opportunities\/(\d+)\/focal-points$/))) {
      const my = await me();
      const { data, error } = await supabase.from('opp_opportunity_focal_points').insert({
        opportunity_id: Number(x[1]), focal_point_id: Number(body.focalPointId),
        principal: body.principal ?? false, assigned_by: my.id,
      }).select('id').single();
      if (error) fail(error);
      // auditoria do vínculo é feita pelo trigger opp_audit_focal_link_tg (RN-024)
      return { id: Number(data.id) };
    }

    if ((x = m(/^\/stages\/(\d+)\/checklist-templates$/))) {
      const { data, error } = await supabase.from('opp_checklist_templates').insert({
        stage_id: Number(x[1]), name: body.name, description: body.description ?? null,
        doc_category: body.docCategory ?? null, required: body.required ?? true,
        position: body.position ?? 0, active: true,
      }).select('id').single();
      if (error) fail(error);
      return { id: Number(data.id), ...body };
    }
    if (p === '/stages') {
      const { data, error } = await supabase.from('opp_stages').insert({
        code: body.code, name: body.name, position: body.position, color: body.color ?? null,
        is_terminal: false, active: true,
      }).select('*').single();
      if (error) fail(error);
      return mapStage(data);
    }

    // Ficha técnica: upsert do cabeçalho (descrição da solução)
    if ((x = m(/^\/opportunities\/(\d+)\/tech-spec$/))) {
      const my = await me();
      const { error } = await supabase.from('opp_tech_specs').upsert({
        opportunity_id: Number(x[1]), descricao: body.descricao ?? '', updated_by: my.id,
      });
      if (error) fail(error);
      return undefined; // auditoria via trigger opp_tech_specs_audit_tg
    }
    if ((x = m(/^\/opportunities\/(\d+)\/tech-spec\/items$/))) {
      const my = await me();
      const { data, error } = await supabase.from('opp_tech_spec_items').insert({
        opportunity_id: Number(x[1]),
        categoria: body.categoria, item: body.item,
        quantidade: body.quantidade ?? null, unidade: body.unidade || 'un',
        detalhe: body.detalhe ?? '', status: body.status ?? 'previsto',
        ordem: body.ordem ?? 0, created_by: my.id,
      }).select('id').single();
      if (error) fail(error);
      return { id: Number(data.id) };
    }
    // Esteira de maturidade: upsert do estado de uma fase
    if ((x = m(/^\/opportunities\/(\d+)\/maturity\/(\d+)$/))) {
      const my = await me();
      const { error } = await supabase.from('opp_maturity_states').upsert(
        {
          opportunity_id: Number(x[1]), phase_id: Number(x[2]),
          status: body.status,
          started_on: body.startedOn ?? null, completed_on: body.completedOn ?? null,
          responsavel: body.responsavel ?? '', nota: body.nota ?? '',
          updated_by: my.id,
        },
        { onConflict: 'opportunity_id,phase_id' },
      );
      if (error) fail(error);
      return undefined; // auditoria via trigger opp_maturity_states_audit_tg
    }
    // Linha do tempo: marco manual
    if ((x = m(/^\/opportunities\/(\d+)\/milestones$/))) {
      const my = await me();
      const { data, error } = await supabase.from('opp_milestones').insert({
        opportunity_id: Number(x[1]),
        occurred_on: body.occurredOn, tipo: body.tipo ?? 'marco',
        titulo: body.titulo, descricao: body.descricao ?? '', created_by: my.id,
      }).select('id').single();
      if (error) fail(error);
      return { id: Number(data.id) };
    }
  }

  if (method === 'PATCH') {
    if (p === '/notifications/read-all') {
      const my = await me();
      await supabase.from('opp_notifications').update({ read_at: new Date().toISOString() })
        .eq('user_id', my.id).is('read_at', null);
      return undefined;
    }
    if ((x = m(/^\/notifications\/(\d+)\/read$/))) {
      await supabase.from('opp_notifications').update({ read_at: new Date().toISOString() }).eq('id', Number(x[1]));
      return undefined;
    }
    if ((x = m(/^\/opportunities\/(\d+)$/))) return updateOpportunity(Number(x[1]), body);
    if ((x = m(/^\/radar\/(\d+)$/))) {
      const patch: Record<string, unknown> = {};
      for (const k of ['abrangencia', 'esfera', 'pais', 'uf', 'cidade', 'objeto', 'orgao_responsavel',
        'valor_estimado_total_contrato', 'periodo', 'tempo_contrato', 'responsavel_serpro',
        'hunter', 'parceiro', 'nome_parceiro'] as const) {
        if (k in body) patch[k] = body[k];
      }
      const { data, error } = await supabase.from('opp_radar').update(patch)
        .eq('id', Number(x[1])).select('*').single();
      if (error) fail(error);
      return { ...data, id: Number(data.id) };
    }
    if ((x = m(/^\/focal-points\/(\d+)$/))) {
      const fpId = Number(x[1]);
      const patch: Record<string, unknown> = {};
      if ('name' in body) patch.name = body.name;
      if ('email' in body) patch.email = body.email?.trim() || null;
      if ('phone' in body) patch.phone = body.phone?.trim() || null;
      if ('papel' in body) patch.papel = body.papel;
      if ('regiao' in body) patch.regiao = body.regiao ?? null;
      if ('notes' in body) patch.notes = body.notes ?? null;
      if ('active' in body) patch.active = body.active;
      if (Object.keys(patch).length) {
        const { error } = await supabase.from('opp_focal_points').update(patch).eq('id', fpId);
        if (error) fail(error);
      }
      if (Array.isArray(body.coverage)) await saveFocalCoverage(fpId, body.coverage);
      await audit([{ entity: 'focal_point', entityId: fpId, action: 'update', newValue: body.name }]);
      return { id: fpId, ...body };
    }
    if ((x = m(/^\/opportunity-focal-points\/(\d+)$/))) {
      const linkId = Number(x[1]);
      if (body.principal === true) {
        const { data: link, error: le } = await supabase.from('opp_opportunity_focal_points')
          .select('opportunity_id').eq('id', linkId).single();
        if (le) fail(le);
        // um principal por oportunidade: desmarca os demais antes de marcar este
        const { error: ue } = await supabase.from('opp_opportunity_focal_points')
          .update({ principal: false })
          .eq('opportunity_id', Number(link.opportunity_id)).eq('principal', true).neq('id', linkId);
        if (ue) fail(ue);
      }
      const { error } = await supabase.from('opp_opportunity_focal_points')
        .update({ principal: body.principal === true }).eq('id', linkId);
      if (error) fail(error);
      return { id: linkId, principal: body.principal === true };
    }
    if ((x = m(/^\/tech-spec-items\/(\d+)$/))) {
      const patch: Record<string, unknown> = {};
      for (const k of ['categoria', 'item', 'unidade', 'detalhe', 'status', 'ordem'] as const) {
        if (k in body) patch[k] = body[k];
      }
      if ('quantidade' in body) patch.quantidade = body.quantidade ?? null;
      const { error } = await supabase.from('opp_tech_spec_items').update(patch).eq('id', Number(x[1]));
      if (error) fail(error);
      return { id: Number(x[1]), ...body }; // auditoria via trigger
    }
    if ((x = m(/^\/milestones\/(\d+)$/))) {
      const patch: Record<string, unknown> = {};
      if ('occurredOn' in body) patch.occurred_on = body.occurredOn;
      for (const k of ['tipo', 'titulo', 'descricao'] as const) if (k in body) patch[k] = body[k];
      const { error } = await supabase.from('opp_milestones').update(patch).eq('id', Number(x[1]));
      if (error) fail(error);
      return { id: Number(x[1]), ...body }; // auditoria via trigger
    }
    if ((x = m(/^\/checklist-templates\/(\d+)$/))) {
      const patch: Record<string, unknown> = {};
      if ('name' in body) patch.name = body.name;
      if ('required' in body) patch.required = body.required;
      if ('active' in body) patch.active = body.active;
      if ('position' in body) patch.position = body.position;
      if ('docCategory' in body) patch.doc_category = body.docCategory;
      const { error } = await supabase.from('opp_checklist_templates').update(patch).eq('id', Number(x[1]));
      if (error) fail(error);
      return { id: Number(x[1]), ...body };
    }
    if ((x = m(/^\/stages\/(\d+)$/))) {
      const patch: Record<string, unknown> = {};
      for (const k of ['code', 'name', 'position', 'color'] as const) if (k in body) patch[k] = body[k];
      if ('active' in body) patch.active = body.active;
      const { error } = await supabase.from('opp_stages').update(patch).eq('id', Number(x[1]));
      if (error) fail(error);
      return { id: Number(x[1]), ...body };
    }
  }

  if (method === 'DELETE') {
    if ((x = m(/^\/clients\/(\d+)$/))) {
      const { error } = await supabase.from('opp_clients').update({ active: false }).eq('id', Number(x[1]));
      if (error) fail(error);
      return undefined;
    }
    if ((x = m(/^\/focal-points\/(\d+)$/))) {
      const { error } = await supabase.from('opp_focal_points').update({ active: false }).eq('id', Number(x[1]));
      if (error) fail(error);
      await audit([{ entity: 'focal_point', entityId: Number(x[1]), action: 'deactivate' }]);
      return undefined;
    }
    if ((x = m(/^\/opportunity-focal-points\/(\d+)$/))) {
      const { error } = await supabase.from('opp_opportunity_focal_points').delete().eq('id', Number(x[1]));
      if (error) fail(error);
      // auditoria via trigger (RN-024)
      return undefined;
    }
    if ((x = m(/^\/radar\/(\d+)$/))) {
      const { error } = await supabase.from('opp_radar').delete().eq('id', Number(x[1]));
      if (error) fail(error);
      // auditoria via trigger opp_radar_audit_tg
      return undefined;
    }
    if ((x = m(/^\/tech-spec-items\/(\d+)$/))) {
      const { error } = await supabase.from('opp_tech_spec_items').delete().eq('id', Number(x[1]));
      if (error) fail(error);
      return undefined; // auditoria via trigger
    }
    if ((x = m(/^\/milestones\/(\d+)$/))) {
      const { error } = await supabase.from('opp_milestones').delete().eq('id', Number(x[1]));
      if (error) fail(error);
      return undefined; // auditoria via trigger
    }
  }

  throw new ApiError(404, `Rota não mapeada no modo ecossistema: ${method} ${p}`);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const api = {
  get: <T>(path: string) => dispatch('GET', path) as Promise<T>,
  post: <T>(path: string, body?: unknown) => dispatch('POST', path, body) as Promise<T>,
  patch: <T>(path: string, body?: unknown) => dispatch('PATCH', path, body) as Promise<T>,
  delete: <T>(path: string) => dispatch('DELETE', path) as Promise<T>,
  postForm: <T>(path: string, form: FormData) => dispatch('POST', path, undefined, form) as Promise<T>,
};
