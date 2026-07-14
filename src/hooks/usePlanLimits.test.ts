import { describe, it, expect } from 'vitest';
import { getPlanConfig, getRequiredPlanForMode, type PlanKey } from './usePlanLimits';

describe('Plan limits — carousel card caps', () => {
  const cases: Array<[PlanKey, number, string]> = [
    ['free', 5, 'Free'],
    ['starter', 5, 'Criador'],
    ['pro', 8, 'Estúdio'],
    ['growth', 10, 'Escala'],
    ['enterprise', 15, 'Enterprise'],
  ];

  it.each(cases)('%s → max %i cards (label: %s)', (planKey, expectedMax, expectedLabel) => {
    const cfg = getPlanConfig(planKey);
    expect(cfg.maxSlidesPerCarousel).toBe(expectedMax);
    expect(cfg.planLabel).toBe(expectedLabel);
  });

  it('falls back to Free config for unknown plan keys', () => {
    // @ts-expect-error — testing runtime fallback
    const cfg = getPlanConfig('nonexistent');
    expect(cfg.planKey).toBe('free');
    expect(cfg.maxSlidesPerCarousel).toBe(5);
  });

  it('never allows an ordering regression across paid tiers', () => {
    const starter = getPlanConfig('starter').maxSlidesPerCarousel;
    const pro = getPlanConfig('pro').maxSlidesPerCarousel;
    const growth = getPlanConfig('growth').maxSlidesPerCarousel;
    const enterprise = getPlanConfig('enterprise').maxSlidesPerCarousel;
    expect(starter).toBeLessThan(pro);
    expect(pro).toBeLessThan(growth);
    expect(growth).toBeLessThanOrEqual(enterprise);
  });
});

describe('Plan limits — mode gating', () => {
  it('Simple mode is available to everyone (free requirement)', () => {
    expect(getRequiredPlanForMode('simple')).toBe('free');
  });

  it('Advanced mode requires at least Estúdio (pro)', () => {
    expect(getRequiredPlanForMode('advanced')).toBe('pro');
    expect(getPlanConfig('starter').allowAdvanced).toBe(false);
    expect(getPlanConfig('pro').allowAdvanced).toBe(true);
    expect(getPlanConfig('growth').allowAdvanced).toBe(true);
  });

  it('Extreme mode requires at least Escala (growth)', () => {
    expect(getRequiredPlanForMode('extreme')).toBe('growth');
    expect(getPlanConfig('starter').allowExtreme).toBe(false);
    expect(getPlanConfig('pro').allowExtreme).toBe(false);
    expect(getPlanConfig('growth').allowExtreme).toBe(true);
  });
});

describe('Plan limits — worst-case cost guardrail', () => {
  // Sanity: monthlyCredits × maxSlides should stay within our margin envelope.
  // Assumindo custo médio ≈ R$ 0,40 por imagem (mix Fast/Pro) e receita mínima
  // por plano, o custo total no pior caso não deve ultrapassar 30% da receita.
  const revenue: Record<PlanKey, number> = {
    free: 0,
    starter: 69.9,
    pro: 139.9,
    growth: 259.9,
    enterprise: 999,
  };
  const COST_PER_IMAGE = 0.4;

  (['starter', 'pro', 'growth'] as PlanKey[]).forEach((plan) => {
    it(`${plan} worst-case cost ≤ 30% of revenue`, () => {
      const cfg = getPlanConfig(plan);
      const worstCaseImages = cfg.monthlyCredits * cfg.maxSlidesPerCarousel;
      const worstCaseCost = worstCaseImages * COST_PER_IMAGE;
      const ratio = worstCaseCost / revenue[plan];
      expect(ratio).toBeLessThanOrEqual(0.3);
    });
  });
});
