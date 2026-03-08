-- Affiliate partners table
CREATE TABLE public.affiliate_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  affiliate_code text NOT NULL UNIQUE,
  commission_percent numeric NOT NULL DEFAULT 20,
  total_earnings numeric NOT NULL DEFAULT 0,
  available_balance numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Affiliate referral tracking
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_url text,
  ip_address text,
  converted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Affiliate commissions (earned from purchases)
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  order_type text NOT NULL, -- 'credits' | 'subscription' | 'gift'
  order_amount numeric NOT NULL,
  commission_percent numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, paid
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Withdrawal requests
CREATE TABLE public.affiliate_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  pix_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, rejected
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- RLS
ALTER TABLE public.affiliate_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

-- Partners: user can see/manage own
CREATE POLICY "Users manage own affiliate" ON public.affiliate_partners
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Referrals: affiliate can see own
CREATE POLICY "Affiliates see own referrals" ON public.affiliate_referrals
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliate_partners WHERE user_id = auth.uid()));

-- Commissions: affiliate can see own
CREATE POLICY "Affiliates see own commissions" ON public.affiliate_commissions
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliate_partners WHERE user_id = auth.uid()));

-- Withdrawals: affiliate can see/create own
CREATE POLICY "Affiliates manage own withdrawals" ON public.affiliate_withdrawals
  FOR ALL TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliate_partners WHERE user_id = auth.uid()))
  WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliate_partners WHERE user_id = auth.uid()));

-- Allow insert referrals for tracking (anon for link clicks)
CREATE POLICY "Anyone can create referrals" ON public.affiliate_referrals
  FOR INSERT TO anon, authenticated WITH CHECK (true);