/**
 * Ellocontent — Credit consumption rules
 *
 * Cost per card by generation type:
 *   - Simples (ElloIA Flash):        1 credit/card
 *   - Avançado (ElloIA Pro):          2 credits/card
 *   - Avançado + Rosto Pessoal:       4 credits/card
 *
 * Web search: +1 credit per generation (always added)
 *
 * Examples:
 *   Post único Simples:            (1×1) + 1 = 2
 *   Carrossel 6 cards Simples:     (6×1) + 1 = 7
 *   Carrossel 6 cards Avançado:    (6×2) + 1 = 13
 *   Carrossel 6 cards Avançado+Rosto: (6×4) + 1 = 25
 *   Carrossel 10 cards Avançado+Rosto: (10×4) + 1 = 41
 */

export type WizardMode = 'simple' | 'advanced' | 'extreme' | 'tweet' | 'tweet2' | 'animated';

export interface CreditCostParams {
  cardCount: number;
  wizardMode: WizardMode;
  hasFaceRef: boolean; // whether face/rosto reference images are used
  includeWebSearch?: boolean; // default true
}

export function getCreditPerCard(wizardMode: WizardMode, hasFaceRef: boolean): number {
  if (wizardMode === 'simple') return 1;
  // Advanced or Extreme with face = 4, without face = 2
  if (hasFaceRef) return 4;
  return 2;
}

export function calculateCreditCost({
  cardCount,
  wizardMode,
  hasFaceRef,
  includeWebSearch = true,
}: CreditCostParams): number {
  const perCard = getCreditPerCard(wizardMode, hasFaceRef);
  const webSearchCost = includeWebSearch ? 1 : 0;
  return (cardCount * perCard) + webSearchCost;
}

export function getCreditCostDescription(params: CreditCostParams): string {
  const perCard = getCreditPerCard(params.wizardMode, params.hasFaceRef);
  const total = calculateCreditCost(params);
  const modeLabel = params.wizardMode === 'simple' ? 'Simples' : params.hasFaceRef ? 'Avançado+Rosto' : 'Avançado';
  return `${params.cardCount} cards × ${perCard} (${modeLabel}) + 1 pesquisa = ${total} créditos`;
}
