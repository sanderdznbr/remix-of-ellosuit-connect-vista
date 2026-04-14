
ALTER TABLE public.trend_configs
  ADD COLUMN IF NOT EXISTS company_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS products_services TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_tone TEXT DEFAULT 'profissional',
  ADD COLUMN IF NOT EXISTS content_goals TEXT[] DEFAULT '{}';
