ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS credits_last_reset_at timestamptz DEFAULT NULL;

-- Backfill: set last reset to current_period_start for active subs
UPDATE public.subscriptions SET credits_last_reset_at = current_period_start WHERE status = 'active' AND credits_last_reset_at IS NULL;