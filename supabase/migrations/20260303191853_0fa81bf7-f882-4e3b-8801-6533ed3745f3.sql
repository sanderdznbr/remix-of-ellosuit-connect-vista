UPDATE public.marketplace_styles SET is_free = true WHERE id IN (
  SELECT id FROM public.marketplace_styles WHERE is_active = true ORDER BY sort_order LIMIT 3
);