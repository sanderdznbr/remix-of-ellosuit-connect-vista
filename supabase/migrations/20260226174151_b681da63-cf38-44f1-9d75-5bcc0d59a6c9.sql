
-- Add new plan types for ellocontent
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'growth';

-- Create table to track monthly credit allocations from subscriptions
CREATE TABLE IF NOT EXISTS public.ellocontent_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  user_id UUID NOT NULL,
  plan_name TEXT NOT NULL, -- starter, pro, growth, enterprise
  monthly_credits INTEGER NOT NULL DEFAULT 40,
  extra_credit_price NUMERIC(10,2) NOT NULL DEFAULT 2.50,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, canceled, past_due
  payment_method TEXT, -- credit_card, pix
  beehive_transaction_id TEXT,
  beehive_status TEXT,
  beehive_secure_id TEXT,
  beehive_secure_url TEXT,
  card_last_digits TEXT,
  card_brand TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_document TEXT,
  customer_phone TEXT,
  monthly_price NUMERIC(10,2) NOT NULL,
  paid_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ellocontent_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own company subscriptions
CREATE POLICY "Users can view own company ellocontent subscriptions"
  ON public.ellocontent_subscriptions
  FOR SELECT
  USING (public.user_belongs_to_company(company_id, auth.uid()));

-- Only admins can insert
CREATE POLICY "Admins can insert ellocontent subscriptions"
  ON public.ellocontent_subscriptions
  FOR INSERT
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- Update trigger
CREATE TRIGGER update_ellocontent_subscriptions_updated_at
  BEFORE UPDATE ON public.ellocontent_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update ai_credit_packages to match ellocontent plans
UPDATE public.ai_credit_packages SET name = 'Pacote 100', description = '100 créditos extras', price_brl = 250.00, credits = 100 WHERE sort_order = 1;
UPDATE public.ai_credit_packages SET name = 'Pacote 500', description = '500 créditos extras', price_brl = 1000.00, credits = 500 WHERE sort_order = 2;
UPDATE public.ai_credit_packages SET name = 'Pacote 1500', description = '1500 créditos extras', price_brl = 2250.00, credits = 1500 WHERE sort_order = 3;
UPDATE public.ai_credit_packages SET name = 'Pacote 5000', description = '5000 créditos extras', price_brl = 7500.00, credits = 5000 WHERE sort_order = 4;
