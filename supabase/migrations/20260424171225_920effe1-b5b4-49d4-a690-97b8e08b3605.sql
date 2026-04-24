DO $$
DECLARE
    -- Map old emails to new realistic data
    new_data JSONB := '[
        {"old": "gabriel.silva@dummy.com", "name": "Gabriel Almeida", "email": "gabriel.almeida@gmail.com"},
        {"old": "beatriz.santos@dummy.com", "name": "Beatriz Moraes", "email": "bia.moraes@hotmail.com"},
        {"old": "lucas.oliveira@dummy.com", "name": "Lucas Mendonça", "email": "lucas.mendonca@outlook.com"},
        {"old": "mariana.costa@dummy.com", "name": "Mariana Andrade", "email": "mari.andrade@gmail.com"},
        {"old": "thiago.pereira@dummy.com", "name": "Thiago Nogueira", "email": "thiago.nogueira@yahoo.com.br"},
        {"old": "juliana.lima@dummy.com", "name": "Juliana Bastos", "email": "juliana.bastos@gmail.com"},
        {"old": "rafael.rocha@dummy.com", "name": "Rafael Cardoso", "email": "rafa.cardoso@hotmail.com"},
        {"old": "camila.souza@dummy.com", "name": "Camila Tavares", "email": "camila.tavares@gmail.com"},
        {"old": "felipe.almeida@dummy.com", "name": "Felipe Monteiro", "email": "felipe.monteiro@outlook.com"},
        {"old": "isabela.ribeiro@dummy.com", "name": "Isabela Fontes", "email": "isa.fontes@gmail.com"},
        {"old": "gustavo.martins@dummy.com", "name": "Gustavo Barbosa", "email": "gustavo.barbosa@uol.com.br"},
        {"old": "larissa.carvalho@dummy.com", "name": "Larissa Pinheiro", "email": "lari.pinheiro@gmail.com"},
        {"old": "bruno.ferreira@dummy.com", "name": "Bruno Azevedo", "email": "bruno.azevedo@hotmail.com"},
        {"old": "amanda.gomes@dummy.com", "name": "Amanda Vieira", "email": "amanda.vieira@gmail.com"},
        {"old": "vinicius.machado@dummy.com", "name": "Vinícius Duarte", "email": "vini.duarte@gmail.com"}
    ]'::jsonb;
    item JSONB;
    v_user_id UUID;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(new_data) LOOP
        SELECT id INTO v_user_id FROM auth.users WHERE email = item->>'old';
        IF v_user_id IS NOT NULL THEN
            UPDATE auth.users 
            SET email = item->>'email',
                raw_user_meta_data = jsonb_set(
                    COALESCE(raw_user_meta_data, '{}'::jsonb),
                    '{display_name}',
                    to_jsonb(item->>'name')
                )
            WHERE id = v_user_id;
            
            UPDATE public.profiles 
            SET display_name = item->>'name'
            WHERE id = v_user_id;

            UPDATE public.companies
            SET name = (item->>'name') || ' Digital'
            WHERE id IN (SELECT company_id FROM public.company_users WHERE user_id = v_user_id);
        END IF;
    END LOOP;
END $$;
