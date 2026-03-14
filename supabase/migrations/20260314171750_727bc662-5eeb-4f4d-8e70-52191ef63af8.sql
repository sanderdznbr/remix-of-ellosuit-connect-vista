
-- Activate PRO plan for lmatozo244@gmail.com
INSERT INTO public.ellocontent_subscriptions (
  company_id, user_id, plan_name, monthly_credits, extra_credit_price,
  status, payment_method, monthly_price, customer_email,
  current_period_start, current_period_end, starts_at, expires_at, paid_at
) VALUES (
  '67464a24-4824-4211-8692-e7a2cc48eb7d',
  '96bf847e-0ac5-41e3-8387-eddb237ba6a4',
  'pro', 120, 1.30,
  'active', 'manual_admin', 159.90, 'lmatozo244@gmail.com',
  now(), now() + interval '1 month', now(), now() + interval '1 month', now()
);

-- Update subscriptions table
UPDATE public.subscriptions 
SET plan_type = 'pro', status = 'active', monthly_price = 159.90,
    current_period_start = now(), current_period_end = now() + interval '1 month'
WHERE company_id = '67464a24-4824-4211-8692-e7a2cc48eb7d';

-- Update storage limit for Pro plan
INSERT INTO public.subscription_limits (company_id, max_storage_gb, max_users)
VALUES ('67464a24-4824-4211-8692-e7a2cc48eb7d', 5, 1)
ON CONFLICT (company_id) DO UPDATE SET max_storage_gb = 5, updated_at = now();
