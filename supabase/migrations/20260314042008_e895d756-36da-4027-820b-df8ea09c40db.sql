
-- Add credit expiration tracking columns to ai_credit_balances
ALTER TABLE public.ai_credit_balances 
  ADD COLUMN IF NOT EXISTS extra_credits numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_credits_expires_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expiration_warning_sent boolean DEFAULT false;

-- Function to expire extra credits when subscription lapses
CREATE OR REPLACE FUNCTION public.check_credit_expiration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
BEGIN
  -- Find companies with extra credits that have expired
  FOR rec IN
    SELECT b.company_id, b.extra_credits, b.balance
    FROM public.ai_credit_balances b
    WHERE b.extra_credits > 0
      AND b.extra_credits_expires_at IS NOT NULL
      AND b.extra_credits_expires_at < now()
  LOOP
    -- Deduct expired extra credits from balance
    UPDATE public.ai_credit_balances
    SET 
      balance = GREATEST(balance - rec.extra_credits, 0),
      extra_credits = 0,
      extra_credits_expires_at = NULL,
      expiration_warning_sent = false,
      updated_at = now()
    WHERE company_id = rec.company_id;

    -- Log the expiration
    INSERT INTO public.ai_credit_transactions (
      company_id, transaction_type, amount, balance_after, description
    ) VALUES (
      rec.company_id,
      'expiration',
      -rec.extra_credits,
      GREATEST(rec.balance - rec.extra_credits, 0),
      'Créditos extras expirados (sem plano ativo por 30 dias)'
    );
  END LOOP;
END;
$function$;

-- Function to set expiration when subscription is canceled/expired
CREATE OR REPLACE FUNCTION public.set_credit_expiration_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When subscription becomes inactive, set 30-day expiration on extra credits
  IF NEW.status IN ('canceled', 'past_due') AND OLD.status = 'active' THEN
    UPDATE public.ai_credit_balances
    SET 
      extra_credits_expires_at = CASE 
        WHEN extra_credits > 0 THEN now() + interval '30 days'
        ELSE NULL
      END,
      expiration_warning_sent = false,
      updated_at = now()
    WHERE company_id = NEW.company_id
      AND extra_credits > 0;
  END IF;

  -- When subscription becomes active again, clear expiration
  IF NEW.status = 'active' AND OLD.status IN ('canceled', 'past_due') THEN
    UPDATE public.ai_credit_balances
    SET 
      extra_credits_expires_at = NULL,
      expiration_warning_sent = false,
      updated_at = now()
    WHERE company_id = NEW.company_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger on ellocontent_subscriptions
DROP TRIGGER IF EXISTS credit_expiration_on_ello_cancel ON public.ellocontent_subscriptions;
CREATE TRIGGER credit_expiration_on_ello_cancel
  AFTER UPDATE ON public.ellocontent_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_credit_expiration_on_cancel();

-- Trigger on subscriptions
DROP TRIGGER IF EXISTS credit_expiration_on_sub_cancel ON public.subscriptions;
CREATE TRIGGER credit_expiration_on_sub_cancel
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_credit_expiration_on_cancel();

-- Function to track extra credits when purchasing top-ups
CREATE OR REPLACE FUNCTION public.add_extra_credits(p_company_id uuid, p_amount numeric, p_description text DEFAULT 'Compra de créditos extras')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_balance NUMERIC;
  has_active_sub BOOLEAN;
BEGIN
  -- Check if company has an active subscription
  SELECT EXISTS (
    SELECT 1 FROM public.ellocontent_subscriptions 
    WHERE company_id = p_company_id AND status = 'active'
    UNION
    SELECT 1 FROM public.subscriptions 
    WHERE company_id = p_company_id AND status = 'active'
  ) INTO has_active_sub;

  -- Add credits
  INSERT INTO public.ai_credit_balances (company_id, balance, total_purchased, extra_credits, extra_credits_expires_at)
  VALUES (p_company_id, p_amount, p_amount, p_amount, 
    CASE WHEN NOT has_active_sub THEN now() + interval '30 days' ELSE NULL END)
  ON CONFLICT (company_id) DO UPDATE SET
    balance = ai_credit_balances.balance + p_amount,
    total_purchased = ai_credit_balances.total_purchased + p_amount,
    extra_credits = ai_credit_balances.extra_credits + p_amount,
    extra_credits_expires_at = CASE 
      WHEN NOT has_active_sub THEN now() + interval '30 days'
      ELSE ai_credit_balances.extra_credits_expires_at
    END,
    updated_at = now();

  SELECT balance INTO new_balance FROM public.ai_credit_balances WHERE company_id = p_company_id;

  INSERT INTO public.ai_credit_transactions (company_id, transaction_type, amount, balance_after, description)
  VALUES (p_company_id, 'purchase', p_amount, new_balance, p_description);

  RETURN jsonb_build_object('success', true, 'balance', new_balance, 'expires_at', 
    CASE WHEN NOT has_active_sub THEN (now() + interval '30 days')::text ELSE NULL END);
END;
$function$;
