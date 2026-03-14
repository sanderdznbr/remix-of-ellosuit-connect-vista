
-- Add commission duration tracking
ALTER TABLE public.affiliate_commissions 
  ADD COLUMN IF NOT EXISTS months_remaining integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_subscription_id uuid,
  ADD COLUMN IF NOT EXISTS commission_percent numeric DEFAULT 20;

-- Add converted_at to referrals for tracking conversion date
ALTER TABLE public.affiliate_referrals
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

-- Function to calculate and create affiliate commission when a referral subscribes
-- 20% commission, paid monthly for 6 months, stops if client cancels
CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ref RECORD;
  aff RECORD;
  commission_amount NUMERIC;
BEGIN
  -- Only process when subscription becomes active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Find referral for this company
    SELECT r.* INTO ref
    FROM public.affiliate_referrals r
    WHERE r.referred_user_id IN (
      SELECT cu.user_id FROM public.company_users cu WHERE cu.company_id = NEW.company_id
    )
    AND r.converted = true
    LIMIT 1;

    IF ref IS NOT NULL THEN
      -- Get affiliate
      SELECT * INTO aff FROM public.affiliate_partners WHERE id = ref.affiliate_id AND is_active = true;
      
      IF aff IS NOT NULL THEN
        -- Calculate 20% of the plan amount
        commission_amount := COALESCE(
          CASE 
            WHEN NEW.plan_name ILIKE '%growth%' THEN 269.90
            WHEN NEW.plan_name ILIKE '%pro%' THEN 159.90
            WHEN NEW.plan_name ILIKE '%starter%' THEN 89.90
            ELSE 0
          END * 0.20, 0);

        IF commission_amount > 0 THEN
          -- Create commission record with 6-month tracking
          INSERT INTO public.affiliate_commissions (
            affiliate_id, referral_id, order_type, order_amount, 
            commission_amount, commission_percent, status,
            months_remaining, expires_at, referral_subscription_id
          ) VALUES (
            aff.id, ref.id, 'subscription', commission_amount / 0.20,
            commission_amount, 20, 'pending',
            6, now() + interval '6 months', NEW.id
          );

          -- Update affiliate earnings
          UPDATE public.affiliate_partners 
          SET total_earnings = total_earnings + commission_amount,
              available_balance = available_balance + commission_amount,
              updated_at = now()
          WHERE id = aff.id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Handle cancellation: stop future commissions
  IF NEW.status IN ('canceled', 'past_due') AND OLD.status = 'active' THEN
    UPDATE public.affiliate_commissions
    SET status = 'canceled', months_remaining = 0
    WHERE referral_subscription_id = NEW.id
      AND status = 'pending'
      AND months_remaining > 0;
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger on ellocontent_subscriptions
DROP TRIGGER IF EXISTS affiliate_commission_on_ello_sub ON public.ellocontent_subscriptions;
CREATE TRIGGER affiliate_commission_on_ello_sub
  AFTER INSERT OR UPDATE ON public.ellocontent_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_affiliate_commission();
