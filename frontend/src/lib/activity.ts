/**
 * Alertas de projeto parado: dias desde a última atividade registrada na
 * auditoria. Réguas do negócio: atenção a partir de 14 dias, crítico a
 * partir de 30. Fonte: GET /activity/last (mapa oportunidade → timestamp).
 */

export const IDLE_WARN_DIAS = 14;
export const IDLE_CRIT_DIAS = 30;

export type LastActivityMap = Record<string, string>;

export function idleDias(lastAt: string | undefined): number | null {
  if (!lastAt) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(lastAt).getTime()) / 86_400_000));
}

export function idleNivel(dias: number | null): 'ok' | 'warn' | 'crit' {
  if (dias == null || dias < IDLE_WARN_DIAS) return 'ok';
  return dias >= IDLE_CRIT_DIAS ? 'crit' : 'warn';
}
