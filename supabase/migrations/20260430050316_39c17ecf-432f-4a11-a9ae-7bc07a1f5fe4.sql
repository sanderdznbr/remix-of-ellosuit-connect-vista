INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated_posts', 'generated_posts', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for generated_posts
CREATE POLICY "Public Access for generated_posts"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated_posts');

CREATE POLICY "Authenticated users can upload cards"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated_posts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own cards"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated_posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);