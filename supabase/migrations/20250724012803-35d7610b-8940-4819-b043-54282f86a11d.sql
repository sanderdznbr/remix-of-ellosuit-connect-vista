
-- Add transcript and audio_url fields to calendar_events table
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS transcript TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create storage bucket for meeting recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('meeting-recordings', 'meeting-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy for users to insert their own meeting recordings
CREATE POLICY "Users can upload their own meeting recordings" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for users to view their own meeting recordings
CREATE POLICY "Users can view their own meeting recordings" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for users to delete their own meeting recordings
CREATE POLICY "Users can delete their own meeting recordings" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
