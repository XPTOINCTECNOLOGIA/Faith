/**
 * Rótulos humanizados (pt-BR) para a trilha de auditoria e atividades.
 * Fonte única — usados pelo Dashboard, pela Auditoria e pelo histórico
 * da oportunidade, para que toda ação nova ganhe nome em um lugar só.
 */

/** Verbo da ação, lido como "Fulano <verbo> <entidade> #id". */
export const ACTION_LABEL: Record<string, string> = {
  create: 'criou',
  update: 'atualizou',
  transition: 'avançou etapa de',
  regress: 'retornou etapa de',
  close: 'encerrou',
  reopen: 'reabriu',
  upload: 'anexou documento em',
  approve: 'aprovou documento de',
  reject: 'rejeitou documento de',
  promote: 'promoveu ao Pipeline',
  delete: 'removeu',
  deactivate: 'desativou',
  download: 'baixou documento de',
  'focal.vinculado': 'vinculou responsável SERPRO em',
  'focal.removido': 'removeu responsável SERPRO de',
  'focal.principal': 'alterou responsável principal de',
};

export const ENTITY_LABEL: Record<string, string> = {
  opportunity: 'oportunidade',
  client: 'cliente',
  partner: 'parceiro',
  document: 'documento',
  comment: 'comentário',
  radar: 'oportunidade do radar',
  focal_point: 'ponto focal',
  opportunity_focal_point: 'oportunidade',
  checklist_item: 'item de checklist',
  tech_spec: 'ficha técnica',
  tech_spec_item: 'item da ficha técnica',
  milestone: 'marco da linha do tempo',
};

/** Tom semântico da ação (badge na Auditoria). */
export const ACTION_TONE: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  create: 'success',
  promote: 'success',
  approve: 'success',
  reopen: 'success',
  transition: 'info',
  update: 'info',
  upload: 'info',
  download: 'neutral',
  'focal.vinculado': 'info',
  'focal.principal': 'info',
  regress: 'warning',
  close: 'warning',
  deactivate: 'warning',
  'focal.removido': 'warning',
  reject: 'error',
  delete: 'error',
};

export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a;
export const entityLabel = (e: string) => ENTITY_LABEL[e] ?? e;
export const actionTone = (a: string) => ACTION_TONE[a] ?? 'neutral';
