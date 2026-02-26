
-- Table to track cloud-based carousel generation jobs
CREATE TABLE public.carousel_generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating_text', 'generating_images', 'completed', 'failed')),
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER NOT NULL DEFAULT 0,
  progress_message TEXT,
  
  -- Input parameters
  topic TEXT NOT NULL,
  keywords TEXT,
  card_count INTEGER NOT NULL DEFAULT 10,
  style_config JSONB,
  marketplace_style_id UUID REFERENCES public.marketplace_styles(id) ON DELETE SET NULL,
  marketplace_style_config JSONB,
  brand_name TEXT,
  user_name TEXT,
  date_label TEXT,
  logo_url TEXT,
  logo_position TEXT,
  show_header BOOLEAN DEFAULT true,
  image_settings JSONB,
  reference_images JSONB,
  face_ref_urls JSONB,
  product_context TEXT,
  web_search_content TEXT,
  web_search_citations JSONB,
  negative_prompt TEXT,
  
  -- Output
  carousel_id UUID REFERENCES public.generated_carousels(id) ON DELETE SET NULL,
  carousel_data JSONB,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.carousel_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can see their own jobs
CREATE POLICY "Users can view their own jobs" ON public.carousel_generation_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own jobs  
CREATE POLICY "Users can create their own jobs" ON public.carousel_generation_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update (edge function uses service role)
-- Edge functions use service_role key which bypasses RLS

-- Index for fast lookups
CREATE INDEX idx_carousel_jobs_user ON public.carousel_generation_jobs(user_id, status);
CREATE INDEX idx_carousel_jobs_status ON public.carousel_generation_jobs(status) WHERE status NOT IN ('completed', 'failed');

-- Trigger for updated_at
CREATE TRIGGER update_carousel_jobs_updated_at
  BEFORE UPDATE ON public.carousel_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for this table so frontend can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.carousel_generation_jobs;
