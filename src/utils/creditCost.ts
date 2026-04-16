/**
 * Ellocontent — Consumo de criativos
 *
 * 1 Criativo = 1 geração completa (carrossel inteiro ou post único)
 * Todos os modos custam 1 criativo por geração.
 *
 * Planos:
 *   - Starter: 10 criativos/mês
 *   - Pro:     30 criativos/mês
 *   - Growth:  80 criativos/mês
 */

export type WizardMode = 'simple' | 'advanced' | 'extreme' | 'tweet' | 'tweet2' | 'animated';

export interface CreditCostParams {
  cardCount: number;
  wizardMode: WizardMode;
  hasFaceRef: boolean;
  includeWebSearch?: boolean;
}

/** Always 1 criativo per generation */
export function getCreditPerCard(_wizardMode: WizardMode, _hasFaceRef: boolean): number {
  return 1;
}

/** Always 1 criativo per generation */
export function calculateCreditCost(_params: CreditCostParams): number {
  return 1;
}

export function getCreditCostDescription(_params: CreditCostParams): string {
  return '1 criativo por geração';
}
