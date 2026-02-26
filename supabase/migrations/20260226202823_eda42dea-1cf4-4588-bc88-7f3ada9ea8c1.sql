
-- Marketplace styles table (only system/admin can insert)
CREATE TABLE public.marketplace_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_images TEXT[] NOT NULL DEFAULT '{}',
  price_credits NUMERIC NOT NULL DEFAULT 0,
  price_brl NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  style_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User purchased styles
CREATE TABLE public.purchased_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  style_id UUID NOT NULL REFERENCES public.marketplace_styles(id),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT DEFAULT 'credits',
  UNIQUE(user_id, style_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchased_styles ENABLE ROW LEVEL SECURITY;

-- Marketplace styles: everyone can read active styles, no one can write via client
CREATE POLICY "Anyone can view active marketplace styles"
  ON public.marketplace_styles FOR SELECT
  USING (is_active = true);

-- Purchased styles: users can see their own purchases
CREATE POLICY "Users can view their own purchases"
  ON public.purchased_styles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own purchases (when buying)
CREATE POLICY "Users can purchase styles"
  ON public.purchased_styles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_marketplace_styles_updated_at
  BEFORE UPDATE ON public.marketplace_styles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
