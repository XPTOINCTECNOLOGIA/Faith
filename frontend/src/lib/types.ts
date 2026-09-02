export interface Me {
  id: number;
  email: string;
  fullName: string;
  displayName: string | null;
  profile: string;
  permissions: string[];
}

export interface Stage {
  id: number;
  code: string;
  name: string;
  position: number;
  color: string | null;
  isTerminal: boolean;
  active: boolean;
}

export interface KanbanCard {
  id: number;
  code: string;
  clientName: string | null;
  valorEstimado: number | null;
  probabilidade: number | null;
  leadSource: 'xpto' | 'parceiro' | 'serpro';
  expectedCloseDate: string | null;
  overdue: boolean;
  checklist: { requiredTotal: number; requiredDone: number; percent: number };
}

export interface KanbanColumn extends Omit<Stage, 'active'> {
  stageId: number;
  count: number;
  totalValue: number;
  cards: KanbanCard[];
}

export interface Client {
  id: number;
  name: string;
  orgao: string | null;
  cnpj: string | null;
  municipio: string | null;
  uf: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface Partner {
  id: number;
  name: string;
  cnpj: string | null;
}

export interface Opportunity {
  id: number;
  code: string;
  leadSource: 'xpto' | 'parceiro' | 'serpro';
  clientId: number;
  client?: Client;
  partnerId: number | null;
  partner?: Partner | null;
  objeto: string;
  solucao: string;
  valorEstimado: number | null;
  receitaPrevista: number | null;
  probabilidade: number | null;
  complexidade: 'baixa' | 'media' | 'alta' | null;
  situacaoComercial: string | null;
  stageId: number;
  stage?: Stage;
  status: 'aberta' | 'ganha' | 'perdida' | 'cancelada';
  closureReason: string | null;
  gestorXptoId: number;
  gestorXpto?: { id: number; fullName: string };
  gestorSerproId: number | null;
  gestorSerpro?: { id: number; fullName: string } | null;
  expectedCloseDate: string | null;
  prazoEstimado: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: number;
  stageId: number;
  stageName: string;
  stagePosition: number;
  name: string;
  required: boolean;
  status: 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado' | 'dispensado';
  documentId: number | null;
  waivedReason: string | null;
  isCurrentStage: boolean;
}

export interface ChecklistResponse {
  items: ChecklistItem[];
  currentStage: { requiredTotal: number; requiredDone: number; percent: number; canAdvance: boolean };
}

export interface PortalDocument {
  id: number;
  name: string;
  category: string | null;
  docType: string | null;
  status: 'em_analise' | 'aprovado' | 'rejeitado';
  currentVersion: number;
  creator?: { fullName: string };
  createdAt: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  opportunityId: number | null;
  readAt: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  pipelineTotal: number;
  totalOpportunities: number;
  open: number;
  won: number;
  conversionRate: number | null;
  overdue: number;
  weightedForecast: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const LEAD_SOURCE_LABEL: Record<string, string> = {
  xpto: 'XPTO',
  parceiro: 'Parceiro',
  serpro: 'SERPRO',
};

export const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  dispensado: 'Dispensado',
};

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
