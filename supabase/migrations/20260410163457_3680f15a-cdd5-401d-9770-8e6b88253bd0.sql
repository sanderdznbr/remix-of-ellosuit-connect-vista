INSERT INTO public.coupons (code, coupon_type, discount_percent, max_uses, current_uses, is_active, description)
VALUES ('ELLOCONTENT', 'discount', 25, 10, 0, true, 'Cupom de lançamento elloContent - 25% OFF em qualquer plano ou compra')
ON CONFLICT DO NOTHING;