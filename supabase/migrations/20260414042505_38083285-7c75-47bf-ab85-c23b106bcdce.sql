ALTER TABLE public.trend_configs
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS logo_dark_url text,
  ADD COLUMN IF NOT EXISTS brand_colors text[] DEFAULT '{}';