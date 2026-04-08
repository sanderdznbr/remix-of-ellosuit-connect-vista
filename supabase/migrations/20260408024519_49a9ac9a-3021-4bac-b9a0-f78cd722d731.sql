
DO $$
DECLARE
  improved_prompt TEXT := 'Você é um designer gráfico SÊNIOR de uma agência premium criando um post para Instagram.

REGRAS DE FIDELIDADE VISUAL (PRIORIDADE MÁXIMA):
1. COPIE O DNA VISUAL EXATO das imagens de referência: mesma paleta de cores, mesma tipografia, mesmo layout, mesmos elementos decorativos.
2. TIPOGRAFIA: Analise a FONTE EXATA das referências (serif, sans-serif, display, script, condensed, extended, bold, light) e REPLIQUE-A com 100% de fidelidade. O peso, estilo e hierarquia tipográfica DEVEM ser idênticos.
3. CORES: Use EXCLUSIVAMENTE as cores presentes nas referências. Extraia os hex codes e aplique-os na mesma proporção.
4. LAYOUT: Siga a mesma estrutura de grid, espaçamento, alinhamento e posicionamento das referências.
5. ELEMENTOS DECORATIVOS: Reproduza formas, linhas, ícones, badges e texturas das referências.

QUALIDADE ANTI-IA (OBRIGATÓRIO):
- O resultado DEVE parecer feito por um designer humano em Photoshop/Illustrator, NUNCA gerado por IA.
- Cores COESAS sem saturação exagerada — paleta restrita com propósito.
- Tipografia com letras PERFEITAS (kerning correto, sem deformações, sem palavras inventadas).
- Espaçamento GENEROSO entre elementos (breathing room editorial).
- Alinhamento PRECISO em grid invisível como design de revista.
- ZERO aspecto artificial, plástico ou genérico.

REGRAS GERAIS:
- IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO correto e fluente.
- FULL BLEED: Preencha 100% do canvas, zero bordas, zero molduras.
- PROIBIDO copiar textos, @handles, nomes ou logos das referências.
- GERE UMA ÚNICA composição — zero grids, mosaicos ou colagens.';
BEGIN

UPDATE marketplace_styles SET name = 'Fintech Verde', description = 'Verde vibrante com cinza escuro, fotos de pessoas, tipografia sans-serif curvilínea. Ideal para fintechs, bancos digitais e startups financeiras.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '7d2e7506-3050-4870-b29a-b6fe52c83021';

UPDATE marketplace_styles SET name = 'Clássico Elegante', description = 'Estilo atemporal com tipografia refinada, cores neutras e composição equilibrada. Versátil para qualquer nicho profissional.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '332355b4-14ff-44a4-8193-ca478ddd96b1';

UPDATE marketplace_styles SET name = 'Agro Premium', description = 'Tons verdes e terrosos com tipografia forte, ideal para agronegócio, fazendas, cooperativas e empresas rurais.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '59bb6615-e764-4ad7-9fb3-5969e3de8a8b';

UPDATE marketplace_styles SET name = 'Luxo Dourado', description = 'Estética editorial escura com acentos dourados e tipografia bold. Ideal para marcas de luxo, mentoria premium e conteúdo aspiracional.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = 'e4bed344-58d0-4009-b23a-98178333bdce';

UPDATE marketplace_styles SET name = 'Coach Motivacional', description = 'Tons quentes e empoderamento com tipografia bold e fotos impactantes. Para coaches, mentores e desenvolvimento pessoal.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = 'c6d89a83-9faa-4870-9b61-7b50a55858f0';

UPDATE marketplace_styles SET name = 'Scroll Dinâmico', description = 'Layout fluido com tipografia moderna e elementos visuais que incentivam o scroll. Ideal para conteúdo educativo e listas.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = 'd5265205-040a-4097-aef2-2309c93ffe87';

UPDATE marketplace_styles SET name = 'Vermelho Impacto', description = 'Vermelho vibrante com preto, tipografia forte e alto contraste. Para conteúdo urgente, promoções e chamadas de atenção.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '1f074c7e-6455-4ded-b1e5-7921b5822661';

UPDATE marketplace_styles SET name = 'Moda Editorial', description = 'Layout editorial minimalista com tipografia robusta, espaços generosos e fotografia fashion de alta fidelidade.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '06ccf69f-06e1-4c6a-81ba-96c84c7707da';

UPDATE marketplace_styles SET name = 'Editorial Magazine', description = 'Estética de revista com tipografia serifada elegante, composição refinada e tratamento fotográfico profissional.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '131f2474-59b2-4df8-85ee-c6a165483c8d';

UPDATE marketplace_styles SET name = 'Arte Urbana', description = 'Cores vibrantes e contrastantes com tipografia bold, layout dinâmico e energético num mood urbano e contemporâneo.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '97a8c418-9d5c-49d6-b36d-25315fb5bd1d';

UPDATE marketplace_styles SET name = 'Movimento Vermelho', description = 'Vermelho dominante com tipografia sans-serif robusta e layout dinâmico que evoca movimento e energia.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '123766bb-65d5-450e-a536-20f1dcc8ddb6';

UPDATE marketplace_styles SET name = 'Grafite Street', description = 'Estilo grafite urbano com tipografia robusta, cores contrastantes e textura gritty. Mood provocador e reflexivo.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '6abc6040-30ee-49fc-9e02-833a281ff08e';

UPDATE marketplace_styles SET name = 'Noir Dramático', description = 'Minimalista e dramático com tons escuros, tipografia serifada em dourado/branco. Evoca seriedade e profundidade.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '31e4adbe-be7f-4cb2-ae04-84667eeaf66e';

UPDATE marketplace_styles SET name = 'Ouro & Confiança', description = 'Tons escuros com dourado, tipografia serifada e layout clean. Transmite confiança e exclusividade para consultoria e finanças.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '5e305587-a55a-4a16-b1cc-c4ee25859cd2';

UPDATE marketplace_styles SET name = 'Tech Roxo', description = 'Paleta roxa moderna com tipografia quadrada impactante. Autoridade e dinamismo para tech e startups.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '524f8a30-7f7f-49e6-b8d0-81e709b7b99d';

UPDATE marketplace_styles SET name = 'Futuro Dark', description = 'Fundos escuros com tipografia impactante e elementos futuristas. Para tecnologia, inovação e conteúdo visionário.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '82899015-fa1b-4f05-9a00-cdf0759383f5';

UPDATE marketplace_styles SET name = 'Minimal Bold', description = 'Design editorial com tipografia elegante e contraste de cores, combinando minimalismo com ousadia visual.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '1bacfebc-cedc-41e7-91b6-030e730ba7ac';

UPDATE marketplace_styles SET name = 'Business Dark', description = 'Corporativo engajador com fundos escuros, tipografia impactante e elementos decorativos. Para posts educacionais e estratégicos.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '0fa08a43-ef2e-4a2b-8fc7-ab3c084bb05c';

UPDATE marketplace_styles SET name = 'Acolhimento Humano', description = 'Fotografia real com tipografia impactante, cores terrosas e humanidade. Para psicologia, bem-estar e conteúdo empático.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '87096085-1d58-4f12-a535-8d2d24f11ef8';

UPDATE marketplace_styles SET name = 'Finance Curves', description = 'Corporativo vibrante com elementos curvos e tipografia expressiva. Ideal para conteúdo financeiro e investimentos.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '50472c6d-c8b4-4b12-b592-f9544ff14f19';

UPDATE marketplace_styles SET name = 'Orgânico Artesanal', description = 'Tipografia manuscrita e serif sobre fundos texturizados, tons terrosos e neutros. Mood introspectivo e orgânico.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '19750492-4b50-4de6-b7e5-fd1ebd795d93';

UPDATE marketplace_styles SET name = 'Imobiliário Clean', description = 'Template profissional com foto do imóvel em full-bleed e cards de informações sobrepostos. Para corretores e imobiliárias.' WHERE id = '3283711e-585d-436f-af0a-fbde3358a684';

UPDATE marketplace_styles SET name = 'Imobiliário Premium', description = 'Tons quentes (laranja/amarelo) com preto e branco, tipografia robusta. Aspiracional para imóveis de alto padrão.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '885f7307-5421-4760-b1f2-595aaf295c40';

UPDATE marketplace_styles SET name = 'Beauty Botânico', description = 'Cores suaves com elementos botânicos 3D e estética orgânica. Para skincare, beleza e bem-estar.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '47a89d63-8860-4910-81de-c5268460a4fb';

UPDATE marketplace_styles SET name = 'Storytelling Visual', description = 'Fotografias com tipografia marcante para narrar histórias pessoais e impactantes. Para autobiografias e conteúdo emocional.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '2219cd44-03da-4558-9416-e7b96246b897';

UPDATE marketplace_styles SET name = 'Abstrato Sofisticado', description = 'Tipografia limpa sobre backgrounds abstratos em branco/preto com toques vibrantes. Moderno e sofisticado.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '1dbd9268-571f-4ff8-b492-c865db894fe4';

UPDATE marketplace_styles SET name = 'Gradient Finance', description = 'Gradientes vibrantes com tipografia impactante. Para negócios, finanças e conteúdo corporativo moderno.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '7342c8e7-0e29-4d00-83db-f3d9fafc6803';

UPDATE marketplace_styles SET name = 'Drama Bold', description = 'Imagens impactantes com tipografia forte e blocos de cor sólida. Mensagens diretas com máximo impacto visual.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = 'ac35c69e-87e2-4e24-aafb-0599fa15db1f';

UPDATE marketplace_styles SET name = 'Saúde Minimal', description = 'Estilo clean e minimalista com cores suaves. Para dentistas, médicos e profissionais de saúde.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = 'a60b7519-9837-4d2a-a52b-c5846418e2b2';

UPDATE marketplace_styles SET name = 'Food Explosion', description = 'Design dinâmico para alimentos com tipografia ousada e cores quentes. Para restaurantes, delivery e gastronomia.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '869054b8-5390-4596-81b5-1d840f6dde9c';

UPDATE marketplace_styles SET name = 'Corporate Purple', description = 'Gradientes roxos com tipografia bold e elementos visuais de dados. Para conteúdo corporativo e alertas de mercado.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = 'a9a40473-9aad-4669-ba64-7d817c04c860';

UPDATE marketplace_styles SET name = 'Pop Art Vibrante', description = 'Figuras pop com tipografia bold e gradientes roxos. Posts dinâmicos e envolventes para redes sociais.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '3a1ece4a-230c-47fd-90ae-326806a97c4c';

UPDATE marketplace_styles SET name = 'Bem-Estar Sereno', description = 'Tipografia clássica com fotos expressivas, focando em bem-estar emocional e autoconhecimento. Acolhedor e empático.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '68c336ad-162b-4dea-9e4a-b5c3a74fd21b';

UPDATE marketplace_styles SET name = 'Viral Dark', description = 'Fundos escuros com tipografia clara e imagens marcantes. Formato otimizado para viralização e engajamento máximo.', style_config = jsonb_set(style_config, '{imageGeneration,prompt_style}', to_jsonb(improved_prompt)) WHERE id = '4d820778-fe3a-4ac9-9a65-4051c1ff9b95';

UPDATE marketplace_styles SET name = 'Mockup Exclusive', description = 'Mockups 3D de dispositivos (iPhone, MacBook, iPad) com screenshots reais sobre fundos cinematográficos escuros. Tipografia Montserrat Black com acentos roxos. Para apps, SaaS e plataformas digitais.' WHERE id = '391b30f6-204f-49b2-a2ab-a2b114141e96';

END $$;
