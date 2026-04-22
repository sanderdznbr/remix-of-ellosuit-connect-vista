
INSERT INTO storage.buckets (id, name, public)
VALUES ('auth-assets', 'auth-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Auth assets public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'auth-assets');

CREATE POLICY "Admins manage auth assets - insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'auth-assets' AND public.is_adminmaster(auth.uid()));

CREATE POLICY "Admins manage auth assets - update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'auth-assets' AND public.is_adminmaster(auth.uid()));

CREATE POLICY "Admins manage auth assets - delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'auth-assets' AND public.is_adminmaster(auth.uid()));

CREATE TABLE IF NOT EXISTS public.ellocontent_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.ellocontent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
ON public.ellocontent_settings FOR SELECT
USING (true);

CREATE POLICY "Only admins manage settings"
ON public.ellocontent_settings FOR ALL
TO authenticated
USING (public.is_adminmaster(auth.uid()))
WITH CHECK (public.is_adminmaster(auth.uid()));
