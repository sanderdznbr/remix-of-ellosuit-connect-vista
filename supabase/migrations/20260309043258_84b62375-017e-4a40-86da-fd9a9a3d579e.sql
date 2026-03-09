
-- Sessions table
CREATE TABLE public.logo_removal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sessão de remoção',
  total_images INTEGER NOT NULL DEFAULT 0,
  processed_images INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Images in each session
CREATE TABLE public.logo_removal_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.logo_removal_sessions(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  result_url TEXT,
  status TEXT NOT NULL DEFAULT 'done',
  regions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.logo_removal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logo_removal_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON public.logo_removal_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own session images"
  ON public.logo_removal_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.logo_removal_sessions s
      WHERE s.id = logo_removal_images.session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.logo_removal_sessions s
      WHERE s.id = logo_removal_images.session_id AND s.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_logo_removal_sessions_updated_at
  BEFORE UPDATE ON public.logo_removal_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
