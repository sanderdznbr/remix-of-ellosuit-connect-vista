DO $$
DECLARE
    user_names TEXT[] := ARRAY['Gabriel Silva', 'Beatriz Santos', 'Lucas Oliveira', 'Mariana Costa', 'Thiago Pereira', 'Juliana Lima', 'Rafael Rocha', 'Camila Souza', 'Felipe Almeida', 'Isabela Ribeiro', 'Gustavo Martins', 'Larissa Carvalho', 'Bruno Ferreira', 'Amanda Gomes', 'Vinícius Machado'];
    user_emails TEXT[] := ARRAY['gabriel.silva@dummy.com', 'beatriz.santos@dummy.com', 'lucas.oliveira@dummy.com', 'mariana.costa@dummy.com', 'thiago.pereira@dummy.com', 'juliana.lima@dummy.com', 'rafael.rocha@dummy.com', 'camila.souza@dummy.com', 'felipe.almeida@dummy.com', 'isabela.ribeiro@dummy.com', 'gustavo.martins@dummy.com', 'larissa.carvalho@dummy.com', 'bruno.ferreira@dummy.com', 'amanda.gomes@dummy.com', 'vinicius.machado@dummy.com'];
    new_user_id UUID;
    v_company_id UUID;
    random_days INTEGER;
    i INTEGER;
BEGIN
    FOR i IN 1..15 LOOP
        new_user_id := gen_random_uuid();
        random_days := floor(random() * 14);
        
        -- 1. Create Auth User
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (
            new_user_id,
            user_emails[i],
            crypt('pass123', gen_salt('bf')),
            now() - (random_days || ' days')::interval,
            now() - (random_days || ' days')::interval,
            now() - (random_days || ' days')::interval,
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('display_name', user_names[i], 'company_name', user_names[i] || ' Digital'),
            'authenticated',
            'authenticated'
        );

        -- 2. Create Profile
        INSERT INTO public.profiles (id, display_name, username, created_at, updated_at)
        VALUES (
            new_user_id, 
            user_names[i], 
            lower(replace(user_names[i], ' ', '_')) || '_' || substr(new_user_id::text, 1, 4),
            now() - (random_days || ' days')::interval,
            now() - (random_days || ' days')::interval
        )
        ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

        -- 3. Get the company_id created by trigger
        SELECT company_id INTO v_company_id FROM public.company_users WHERE user_id = new_user_id LIMIT 1;

        -- 4. Set Credit Balance
        INSERT INTO public.ai_credit_balances (company_id, balance, total_purchased, total_consumed, created_at, updated_at)
        VALUES (
            v_company_id,
            3.00,
            10.00,
            7.00,
            now() - (random_days || ' days')::interval,
            now() - (random_days || ' days')::interval
        );

        -- 5. Create Activity with dummy carousel_data
        INSERT INTO public.generated_carousels (company_id, user_id, title, topic, carousel_data, card_count, post_format, created_at, updated_at)
        VALUES (
            v_company_id,
            new_user_id,
            'Meus Primeiros Posts',
            'Marketing',
            '{"slides": [{"title": "Bem-vindo", "content": "Este é um post fictício para demonstração."}]}'::jsonb,
            1,
            'portrait',
            now() - (random_days || ' days')::interval + interval '1 hour',
            now() - (random_days || ' days')::interval + interval '1 hour'
        );

    END LOOP;
END $$;
