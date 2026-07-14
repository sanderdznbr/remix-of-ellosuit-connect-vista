// Shared plan-limit helpers for edge functions.
// Keep this pure and dependency-free so it can be tested with `deno test`.

export type PlanKey = 'free' | 'starter' | 'pro' | 'growth' | 'enterprise';

export const MAX_SLIDES_BY_PLAN: Record<PlanKey, number> = {
  free: 5,
  starter: 5,      // Criador
  pro: 8,          // Estúdio
  growth: 10,      // Escala
  enterprise: 15,
};

/** Normalize a plan name (from DB) to a canonical PlanKey. */
export function normalizePlanKey(planName: string | null | undefined): PlanKey {
  const n = (planName || '').toLowerCase();
  if (n.includes('growth') || n.includes('escala')) return 'growth';
  if (n.includes('enterprise')) return 'enterprise';
  if (n.includes('pro') || n.includes('estúdio') || n.includes('estudio')) return 'pro';
  if (n.includes('starter') || n.includes('criador')) return 'starter';
  return 'free';
}

export function getMaxSlidesForPlan(planName: string | null | undefined): number {
  return MAX_SLIDES_BY_PLAN[normalizePlanKey(planName)];
}

/**
 * Validate a generation request against the plan's card cap.
 * Returns null on success or an error object suitable for a 403 response.
 */
export function validateCardCount(
  cardCount: number,
  planName: string | null | undefined,
): { error: string; max: number; requested: number } | null {
  const max = getMaxSlidesForPlan(planName);
  const requested = Math.max(1, Math.floor(cardCount || 1));
  if (requested > max) {
    return {
      error: `Seu plano permite carrosséis com até ${max} slides. Você pediu ${requested}.`,
      max,
      requested,
    };
  }
  return null;
}
