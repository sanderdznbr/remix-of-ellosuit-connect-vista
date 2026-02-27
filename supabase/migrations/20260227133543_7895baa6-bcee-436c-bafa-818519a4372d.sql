
-- Create saved_prompts table for the Prompt Gallery feature
CREATE TABLE public.saved_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_prompts ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own company's prompts
CREATE POLICY "Users can view company prompts"
  ON public.saved_prompts FOR SELECT
  USING (public.user_belongs_to_company(company_id, auth.uid()));

CREATE POLICY "Users can create prompts"
  ON public.saved_prompts FOR INSERT
  WITH CHECK (public.user_belongs_to_company(company_id, auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON public.saved_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON public.saved_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_saved_prompts_updated_at
  BEFORE UPDATE ON public.saved_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast lookup
CREATE INDEX idx_saved_prompts_company ON public.saved_prompts(company_id);
