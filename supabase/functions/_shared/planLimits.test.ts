import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  MAX_SLIDES_BY_PLAN,
  getMaxSlidesForPlan,
  normalizePlanKey,
  validateCardCount,
} from "./planLimits.ts";

Deno.test("normalizePlanKey — canonical keys", () => {
  assertEquals(normalizePlanKey("starter"), "starter");
  assertEquals(normalizePlanKey("pro"), "pro");
  assertEquals(normalizePlanKey("growth"), "growth");
  assertEquals(normalizePlanKey("enterprise"), "enterprise");
  assertEquals(normalizePlanKey(""), "free");
  assertEquals(normalizePlanKey(null), "free");
  assertEquals(normalizePlanKey(undefined), "free");
});

Deno.test("normalizePlanKey — new Portuguese labels", () => {
  assertEquals(normalizePlanKey("Criador"), "starter");
  assertEquals(normalizePlanKey("Plano Criador"), "starter");
  assertEquals(normalizePlanKey("Estúdio"), "pro");
  assertEquals(normalizePlanKey("Estudio"), "pro");
  assertEquals(normalizePlanKey("Escala"), "growth");
  assertEquals(normalizePlanKey("ESCALA ANUAL"), "growth");
});

Deno.test("getMaxSlidesForPlan — caps per plan", () => {
  assertEquals(getMaxSlidesForPlan("free"), 5);
  assertEquals(getMaxSlidesForPlan("Criador"), 5);
  assertEquals(getMaxSlidesForPlan("Estúdio"), 8);
  assertEquals(getMaxSlidesForPlan("Escala"), 10);
  assertEquals(getMaxSlidesForPlan("Enterprise"), 15);
});

Deno.test("MAX_SLIDES_BY_PLAN — monotonic across paid tiers", () => {
  const { starter, pro, growth, enterprise } = MAX_SLIDES_BY_PLAN;
  if (!(starter < pro && pro < growth && growth <= enterprise)) {
    throw new Error(`Non-monotonic tiers: ${starter} < ${pro} < ${growth} <= ${enterprise}`);
  }
});

Deno.test("validateCardCount — passes when within cap", () => {
  assertEquals(validateCardCount(5, "Criador"), null);
  assertEquals(validateCardCount(8, "Estúdio"), null);
  assertEquals(validateCardCount(10, "Escala"), null);
  assertEquals(validateCardCount(1, "free"), null); // single post always ok
});

Deno.test("validateCardCount — rejects when over cap", () => {
  const r1 = validateCardCount(6, "Criador");
  assertEquals(r1?.max, 5);
  assertEquals(r1?.requested, 6);

  const r2 = validateCardCount(12, "Estúdio");
  assertEquals(r2?.max, 8);
  assertEquals(r2?.requested, 12);

  const r3 = validateCardCount(15, "Escala");
  assertEquals(r3?.max, 10);
  assertEquals(r3?.requested, 15);
});

Deno.test("validateCardCount — coerces bad input safely", () => {
  assertEquals(validateCardCount(0, "Criador"), null);       // clamped to 1
  assertEquals(validateCardCount(-3, "Escala"), null);       // clamped to 1
  assertEquals(validateCardCount(5.9, "Criador"), null);     // floored to 5
  assertEquals(validateCardCount(6.9, "Criador")?.max, 5);   // floored to 6, still over
});
