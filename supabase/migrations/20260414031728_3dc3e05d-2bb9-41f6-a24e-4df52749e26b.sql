-- suppressed_emails
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT 'unsubscribe',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

-- email_unsubscribe_tokens
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- email_send_log
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT,
  template_name TEXT,
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

-- email_send_state (single-row config)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  retry_after_until TIMESTAMPTZ,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

-- Insert default config row
INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_send_log_message_id ON public.email_send_log(message_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created_at ON public.email_send_log(created_at DESC);