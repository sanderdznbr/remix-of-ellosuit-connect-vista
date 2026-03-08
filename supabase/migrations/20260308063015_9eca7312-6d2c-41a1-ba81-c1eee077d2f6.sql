
-- Gift keys table for credit gift purchases
CREATE TABLE public.gift_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_key TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL,
  price_brl NUMERIC(10,2) NOT NULL,
  purchased_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'redeemed')),
  beehive_transaction_id TEXT,
  beehive_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.gift_keys ENABLE ROW LEVEL SECURITY;

-- Users can see keys they purchased
CREATE POLICY "Users can view own purchased keys"
  ON public.gift_keys FOR SELECT TO authenticated
  USING (purchased_by = auth.uid());

-- Users can view keys they redeemed
CREATE POLICY "Users can view own redeemed keys"
  ON public.gift_keys FOR SELECT TO authenticated
  USING (redeemed_by = auth.uid());

-- Index for fast key lookup
CREATE INDEX idx_gift_keys_key ON public.gift_keys(gift_key);
CREATE INDEX idx_gift_keys_purchased_by ON public.gift_keys(purchased_by);
