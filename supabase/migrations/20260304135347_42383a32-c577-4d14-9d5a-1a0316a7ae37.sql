
-- Table to store generated portrait photos
CREATE TABLE public.generated_portraits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  prompt TEXT NOT NULL,
  face_ref_urls JSONB DEFAULT '[]'::jsonb,
  style_ref_urls JSONB DEFAULT '[]'::jsonb,
  marketplace_style_id UUID REFERENCES public.marketplace_styles(id),
  result_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.generated_portraits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portraits"
  ON public.generated_portraits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own portraits"
  ON public.generated_portraits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own portraits"
  ON public.generated_portraits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own portraits"
  ON public.generated_portraits FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.generated_portraits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
