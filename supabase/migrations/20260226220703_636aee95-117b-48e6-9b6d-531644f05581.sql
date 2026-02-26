
-- Create storage bucket for marketplace style images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-assets', 'marketplace-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view marketplace assets (public bucket)
CREATE POLICY "Marketplace assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace-assets');

-- Only authenticated users can upload to marketplace-assets
CREATE POLICY "Authenticated users can upload marketplace assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketplace-assets' AND auth.role() = 'authenticated');

-- Authenticated users can delete their own uploads
CREATE POLICY "Authenticated users can delete marketplace assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'marketplace-assets' AND auth.role() = 'authenticated');
