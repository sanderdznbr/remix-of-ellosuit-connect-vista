
-- Trend configs: nicho/configuração por empresa
CREATE TABLE public.trend_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  niche TEXT NOT NULL DEFAULT '',
  target_audience TEXT DEFAULT '',
  keywords TEXT DEFAULT '',
  language TEXT NOT NULL DEFAULT 'pt-BR',
  country TEXT NOT NULL DEFAULT 'BR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.trend_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trend configs"
ON public.trend_configs FOR ALL
TO authenticated
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- Daily trends
CREATE TABLE public.daily_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'ai_generated',
  trend_date DATE NOT NULL DEFAULT CURRENT_DATE,
  relevance_score INTEGER DEFAULT 50,
  used BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage daily trends"
ON public.daily_trends FOR ALL
TO authenticated
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- Indexes
CREATE INDEX idx_daily_trends_company_date ON public.daily_trends(company_id, trend_date DESC);
CREATE INDEX idx_trend_configs_company ON public.trend_configs(company_id);

-- Updated_at triggers
CREATE TRIGGER update_trend_configs_updated_at
  BEFORE UPDATE ON public.trend_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_daily_trends_updated_at
  BEFORE UPDATE ON public.daily_trends
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
