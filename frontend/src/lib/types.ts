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

export interface FocalPointCoverage {
  id: number;
  uf: string;
  municipio: string | null;
}

export interface FocalPoint {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  papel: 'responsavel_departamento' | 'divisao_publica' | 'outro';
  regiao: number | null;
  notes?: string | null;
  active: boolean;
  coverage: FocalPointCoverage[];
}

export interface OpportunityFocalPoint {
  id: number;
  principal: boolean;
  autoAssigned: boolean;
  assignedAt: string;
  focalPoint: FocalPoint;
}

export interface RadarOpportunity {
  id: number;
  abrangencia: 'Nacional' | 'Internacional';
  esfera: 'Federal' | 'Estadual' | 'Municipal';
  pais: string;
  uf: string;
  cidade: string;
  icone_bandeira: string;
  objeto: string;
  orgao_responsavel: string;
  valor_estimado_total_contrato: string;
  periodo: string;
  tempo_contrato: string;
  valor_mensal: string;
  responsavel_serpro: string;
  hunter: string;
  parceiro: string;
  nome_parceiro: string;
}

/** R5 — espelho do cálculo do banco, para pré-visualização no formulário. */
export function radarValorMensal(total: string, tempoContrato: string): string {
  const digits = total.replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.');
  const v = Number(digits);
  const m = tempoContrato.match(/(\d+)/);
  if (!digits || !Number.isFinite(v) || v <= 0 || !m) return 'Não informado';
  const meses = /ano/i.test(tempoContrato) ? Number(m[1]) * 12 : Number(m[1]);
  if (!meses) return 'Não informado';
  return (v / meses).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

export function radarParseBRL(total: string): number {
  const digits = total.replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.');
  const v = Number(digits);
  return Number.isFinite(v) ? v : 0;
}

export const FOCAL_PAPEL_LABEL: Record<string, string> = {
  responsavel_departamento: 'Responsável de Departamento',
  divisao_publica: 'Divisão Pública da Região',
  outro: 'Outro',
};

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

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
