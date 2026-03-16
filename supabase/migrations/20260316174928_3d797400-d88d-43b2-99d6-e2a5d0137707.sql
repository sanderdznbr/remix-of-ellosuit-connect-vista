
CREATE TABLE public.saved_prompt_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.saved_prompts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'screenshot',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_prompt_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company prompt media"
  ON public.saved_prompt_media FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own company prompt media"
  ON public.saved_prompt_media FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own company prompt media"
  ON public.saved_prompt_media FOR DELETE
  TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE INDEX idx_saved_prompt_media_prompt_id ON public.saved_prompt_media(prompt_id);
