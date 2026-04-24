-- Adiciona Kaled (kaledomar@gmail.com) ao plano Growth com 10000 créditos
DO $$
DECLARE
  v_user uuid := '6a964b97-c2a6-4917-b85d-ada165bde9e4';
  v_company uuid := '49d5144d-da0c-4eaf-bd20-db21a535ef60';
BEGIN
  -- 1) Atualiza subscription principal pra Growth
  UPDATE public.subscriptions
  SET plan_type = 'growth', status = 'active', monthly_price = 395.00, updated_at = now()
  WHERE company_id = v_company;

  -- 2) Cria ellocontent_subscription Growth (aparece em Assinaturas no admin)
  INSERT INTO public.ellocontent_subscriptions (
    company_id, user_id, plan_name, monthly_credits, monthly_price,
    status, payment_method, customer_name, customer_email, customer_document,
    paid_at, starts_at, current_period_start, current_period_end,
    metadata
  ) VALUES (
    v_company, v_user, 'Growth', 10000, 395.00,
    'active', 'manual', 'Kaled Charkieh Omar', 'kaledomar@gmail.com', NULL,
    now(), now(), now(), now() + interval '30 days',
    jsonb_build_object('source','admin_manual','granted_by','admin')
  );

  -- 3) Adiciona 10000 créditos via função (já loga transação)
  PERFORM public.add_ai_credits(v_company, 10000, 'Créditos manuais — plano Growth (admin)');
END $$;