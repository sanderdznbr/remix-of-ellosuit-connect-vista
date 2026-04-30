-- 1. Update generated_carousels to support background status
ALTER TABLE public.generated_carousels 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Create a tasks table for granular slide tracking
CREATE TABLE IF NOT EXISTS public.carousel_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    carousel_id UUID REFERENCES public.generated_carousels(id) ON DELETE CASCADE,
    card_index INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    image_url TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carousel_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own carousel tasks"
ON public.carousel_tasks FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.generated_carousels 
    WHERE id = carousel_tasks.carousel_id 
    AND user_id = auth.uid()
));

-- Function to handle task updates
CREATE OR REPLACE FUNCTION public.handle_carousel_task_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_carousel_tasks_timestamp
BEFORE UPDATE ON public.carousel_tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_carousel_task_update();