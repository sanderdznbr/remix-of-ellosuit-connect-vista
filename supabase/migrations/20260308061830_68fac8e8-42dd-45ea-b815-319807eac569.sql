
-- Coupons table for discounts and gift redemptions
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  coupon_type TEXT NOT NULL DEFAULT 'discount' CHECK (coupon_type IN ('discount', 'credits', 'plan')),
  -- For discount type
  discount_percent INTEGER DEFAULT 0,
  discount_fixed NUMERIC DEFAULT 0,
  -- For credits type
  credits_amount INTEGER DEFAULT 0,
  -- For plan type
  plan_type TEXT,
  plan_months INTEGER DEFAULT 1,
  -- Limits
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  min_purchase NUMERIC DEFAULT 0,
  -- Validity
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Track coupon redemptions
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Each user can only redeem a coupon once
CREATE UNIQUE INDEX idx_coupon_user_unique ON public.coupon_redemptions(coupon_id, user_id);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active coupons (to validate)
CREATE POLICY "Authenticated users can read active coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING (is_active = true);

-- Users can see their own redemptions
CREATE POLICY "Users can see own redemptions"
  ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own redemptions
CREATE POLICY "Users can insert own redemptions"
  ON public.coupon_redemptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER set_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
