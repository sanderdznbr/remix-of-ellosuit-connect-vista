
-- Create brand asset folders table
CREATE TABLE public.brand_asset_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#7B50DC',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to brand_assets
ALTER TABLE public.brand_assets ADD COLUMN folder_id UUID REFERENCES public.brand_asset_folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.brand_asset_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_asset_folders
CREATE POLICY "Users can view their company folders"
  ON public.brand_asset_folders FOR SELECT
  USING (public.user_belongs_to_company(company_id, auth.uid()));

CREATE POLICY "Users can create folders in their company"
  ON public.brand_asset_folders FOR INSERT
  WITH CHECK (public.user_belongs_to_company(company_id, auth.uid()));

CREATE POLICY "Users can update their company folders"
  ON public.brand_asset_folders FOR UPDATE
  USING (public.user_belongs_to_company(company_id, auth.uid()));

CREATE POLICY "Users can delete their company folders"
  ON public.brand_asset_folders FOR DELETE
  USING (public.user_belongs_to_company(company_id, auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_brand_asset_folders_updated_at
  BEFORE UPDATE ON public.brand_asset_folders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
