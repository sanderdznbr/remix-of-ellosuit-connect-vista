import "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, topic, keywords, cardCount, prompt, imageSize, query, referenceImageUrls, faceReferenceUrls, styleReferenceUrls, username } = body;

    // ===== INSTAGRAM PROFILE FETCH =====
    if (action === 'instagram-profile') {
      const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
      if (!SERPAPI_API_KEY) {
        return new Response(JSON.stringify({ error: 'SERPAPI_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const igUsername = (username || '').replace(/^@/, '').trim();
      if (!igUsername) {
        return new Response(JSON.stringify({ error: 'Username is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Fetching Instagram profile for:', igUsername);

      const igUrl = `https://www.searchapi.io/api/v1/search?engine=instagram_profile&username=${encodeURIComponent(igUsername)}&api_key=${SERPAPI_API_KEY}`;
      const igRes = await fetch(igUrl);

      if (!igRes.ok) {
        const errText = await igRes.text();
        console.error('Instagram API error:', igRes.status, errText);
        return new Response(JSON.stringify({ error: 'Erro ao buscar perfil do Instagram' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const igData = await igRes.json();
      const profile = igData.profile || {};
      const posts = (igData.posts || []).slice(0, 12);

      // Helper to proxy an image URL to base64 data URI
      async function proxyImageToBase64(imageUrl: string): Promise<string | null> {
        try {
          const imgRes = await fetch(imageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          if (!imgRes.ok) return null;
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await imgRes.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const b64 = btoa(binary);
          return `data:${contentType};base64,${b64}`;
        } catch (e) {
          console.error('Failed to proxy image:', e);
          return null;
        }
      }

      // Collect raw image URLs first
      const rawImages: { id: string; url: string; thumb: string; label: string; type: string }[] = [];

      if (profile.avatar_hd || profile.avatar) {
        rawImages.push({
          id: 'avatar',
          url: profile.avatar_hd || profile.avatar,
          thumb: profile.avatar || profile.avatar_hd,
          label: `${profile.name || igUsername} - Foto de perfil`,
          type: 'avatar',
        });
      }

      for (const post of posts) {
        if (post.link) {
          rawImages.push({
            id: post.id || `post-${rawImages.length}`,
            url: post.link,
            thumb: post.thumbnail || post.link,
            label: (post.caption || '').slice(0, 60) || `Post de @${igUsername}`,
            type: 'post',
          });
        }
        if (post.carousel_items) {
          for (const item of post.carousel_items.slice(0, 3)) {
            if (item.link && item.type === 'image') {
              rawImages.push({
                id: item.id || `carousel-${rawImages.length}`,
                url: item.link,
                thumb: item.link,
                label: `Carrossel de @${igUsername}`,
                type: 'post',
              });
            }
          }
        }
      }

      // Proxy all images to base64 in parallel (limit to 16 for performance)
      const limitedRaw = rawImages.slice(0, 16);
      const images = await Promise.all(limitedRaw.map(async (img) => {
        const b64 = await proxyImageToBase64(img.thumb || img.url);
        return {
          ...img,
          url: b64 || img.url,
          thumb: b64 || img.thumb,
        };
      }));

      return new Response(JSON.stringify({
        success: true,
        profile: {
          username: profile.username || igUsername,
          name: profile.name || igUsername,
          bio: profile.bio || '',
          avatar: images.find(i => i.type === 'avatar')?.thumb || profile.avatar_hd || profile.avatar || '',
          followers: profile.followers || 0,
          is_verified: profile.is_verified || false,
        },
        images,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== WEB SEARCH for reference images (SerpAPI Google Images) =====
    if (action === 'web-search') {
      const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
      
      if (!SERPAPI_API_KEY) {
        // Fallback to Pexels if SerpAPI not configured
        const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
        if (!PEXELS_API_KEY) {
          return new Response(JSON.stringify({ error: 'No image search API configured' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const searchQuery = query || topic || '';
        const pexelsRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=20&orientation=portrait`,
          { headers: { 'Authorization': PEXELS_API_KEY } }
        );
        let pexelsImages: any[] = [];
        if (pexelsRes.ok) {
          const pexelsData = await pexelsRes.json();
          pexelsImages = (pexelsData.photos || []).map((p: any) => ({
            id: p.id, url: p.src.large2x || p.src.large, thumb: p.src.medium,
            small: p.src.small, alt: p.alt || searchQuery, photographer: p.photographer, source: 'pexels',
          }));
        }
        return new Response(JSON.stringify({ success: true, images: pexelsImages, query: searchQuery }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const searchQuery = query || topic || '';
      if (!searchQuery) {
        return new Response(JSON.stringify({ error: 'Query is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('SearchAPI image search for:', searchQuery);

      const serpUrl = `https://www.searchapi.io/api/v1/search?engine=google_images&q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_API_KEY}&time_period=last_year&safe=off&image_size=large`;
      
      const serpRes = await fetch(serpUrl);
      let images: any[] = [];
      
      if (serpRes.ok) {
        const serpData = await serpRes.json();
        images = (serpData.images || []).slice(0, 20).map((item: any, idx: number) => ({
          id: `serp-${idx}`,
          url: item.original?.link,
          thumb: item.thumbnail,
          small: item.thumbnail,
          alt: item.title || searchQuery,
          photographer: item.source?.name || 'Google',
          source: 'google',
          width: item.original?.width,
          height: item.original?.height,
        }));
      } else {
        const errText = await serpRes.text();
        console.error('SerpAPI error:', serpRes.status, errText);
        
        // Fallback to Pexels
        const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
        if (PEXELS_API_KEY) {
          const pexelsRes = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=15`,
            { headers: { 'Authorization': PEXELS_API_KEY } }
          );
          if (pexelsRes.ok) {
            const pexelsData = await pexelsRes.json();
            images = (pexelsData.photos || []).map((p: any) => ({
              id: p.id, url: p.src.large2x || p.src.large, thumb: p.src.medium,
              alt: p.alt || searchQuery, photographer: p.photographer, source: 'pexels',
            }));
          }
        }
      }

      return new Response(JSON.stringify({ success: true, images, query: searchQuery }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== ENHANCE PROMPT =====
    if (action === 'enhance-prompt') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const enhanceResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: `Você é um especialista em criação de conteúdo editorial para Instagram. Receba um tópico simples e transforme em um prompt OTIMIZADO e DETALHADO para gerar um carrossel profissional.

REGRAS:
- Expanda o tópico com detalhes específicos, ângulos editoriais interessantes e gancho de engajamento
- Se mencionar marcas/pessoas reais, adicione contexto relevante sobre eles
- Se mencionar Ellosuit, contextualize as funcionalidades específicas da plataforma que se aplicam
- Mantenha o tom profissional e editorial
- O resultado deve ser 2-4 frases, máximo 200 palavras
- Responda APENAS com o prompt melhorado, sem explicações adicionais
- Em português brasileiro` },
            { role: 'user', content: `Tópico original: ${prompt || topic}` },
          ],
        }),
      });

      if (!enhanceResponse.ok) {
        const errText = await enhanceResponse.text();
        console.error('Enhance prompt error:', enhanceResponse.status, errText);
        return new Response(JSON.stringify({ error: 'Erro ao melhorar prompt' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const enhanceData = await enhanceResponse.json();
      const enhanced = enhanceData.choices?.[0]?.message?.content || prompt || topic;

      return new Response(JSON.stringify({ success: true, enhancedPrompt: enhanced.trim() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== GENERATE CONTENT =====
    if (action === 'generate-content') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const numCards = cardCount || 7;
      const imageCardIndices = body.imageCardIndices || []; // which cards should have images

      const systemPrompt = `Você é um especialista em criação de carrosséis editoriais profissionais para Instagram no formato 1080x1350.

CONTEXTO IMPORTANTE - O QUE É A ELLOSUIT (USE ESSES DADOS SEMPRE QUE O TÓPICO ENVOLVER A ELLOSUIT):
A Ellosuit é uma plataforma SaaS completa de gestão empresarial, CRM e marketing com inteligência artificial. Ela foi projetada para empresas, agências e empreendedores que precisam centralizar operações, automatizar atendimento e escalar vendas.

MÓDULOS E FUNCIONALIDADES DA ELLOSUIT:
1. **Hub Omni (Comunicação e Atendimento)**:
   - CRM inteligente: gestão completa de clientes, leads, pipeline de vendas com campos personalizados e tags
   - Agentes de IA: chatbots personalizáveis que atendem no WhatsApp e chat web 24h/dia, com personalidade configurável, base de conhecimento e tom de voz da marca
   - WhatsApp Business integrado: envio de mensagens, campanhas em massa, chatbots automatizados e atendimento humano no mesmo painel
   - Email marketing: criação de campanhas, templates visuais, rastreamento de aberturas e cliques com analytics detalhados
   - Automações de fluxo: triggers inteligentes (novo lead, mensagem recebida, etc.) com ações automatizadas

2. **Hub Flow (Marketing e Produtividade)**:
   - Gerador de Carrosséis com IA: criação automatizada de posts editoriais para Instagram com busca de referências na web
   - Calendário inteligente: agendamento de reuniões, eventos e compromissos com buffer e links de booking públicos
   - Reuniões por vídeo (LiveKit): videoconferência integrada com gravação, transcrição e compartilhamento de tela
   - Biblioteca de Marca: repositório centralizado de logos, ícones e screenshots para consistência visual
   - Email Designer: editor visual drag-and-drop para criar emails profissionais

3. **Hub Track (Rastreamento e Analytics)**:
   - Documentos rastreáveis: envie PDFs e saiba quando o destinatário abriu, quanto tempo leu e quais páginas visitou
   - Links rastreáveis: URLs encurtadas com analytics de cliques, dispositivos e localização
   - Dashboard Ello Vision: central de inteligência com IA que analisa métricas de engajamento, identifica riscos de churn e sugere ações estratégicas

4. **Hub Suite (Gestão Empresarial)**:
   - Banco de dados unificado: todos os contatos centralizados com campos customizáveis, importação/exportação e filtros avançados
   - Contratos e propostas: templates editáveis, geração automática de documentos com dados do CRM
   - Gestão de documentos: pastas organizadas, upload, compartilhamento e controle de versões
   - Serviços e produtos: catálogo de serviços com precificação, custos e margens
   - Recibos e notas: emissão automatizada com numeração sequencial

5. **Recursos Transversais**:
   - Notificações em tempo real: alertas de emails abertos, mensagens recebidas, eventos próximos
   - Permissões por usuário: controle granular de acesso por módulo e ação (admin, manager, member)
   - Multi-empresa: um usuário pode gerenciar múltiplas empresas no mesmo painel
   - API aberta: webhooks e integrações com ferramentas externas
   - Modo escuro/claro com identidade visual por hub

A Ellosuit ajuda empresas e empreendedores a automatizar processos, melhorar atendimento ao cliente e escalar vendas usando IA. Sempre que o tópico mencionar "Ellosuit", use esse conhecimento DETALHADO para gerar conteúdo PRECISO, ESPECÍFICO e PROFISSIONAL sobre cada funcionalidade relevante.

Gere conteúdo para um carrossel de ${numCards} cards sobre o tópico fornecido.

REGRAS DE LAYOUT (siga EXATAMENTE):
- Card 1 (cover): Título impactante em CAIXA ALTA (máx 10 palavras) + subtítulo curto descritivo
- Cards 2 a ${numCards - 1} (content): Cada card tem DOIS blocos de texto:
  - "bodyTop": Parágrafo principal (30-60 palavras), informativo e denso. Deve conter trechos-chave que serão destacados em cor accent (coloque entre **asteriscos duplos** os trechos mais importantes, máx 15 palavras destacadas)
  - "bodyBottom": Segundo parágrafo (20-40 palavras), complementar, dados adicionais ou contexto
  - "imagePrompt": Descrição detalhada para gerar uma imagem de alta qualidade. Se o tópico mencionar marcas, produtos ou PESSOAS REAIS, descreva visualmente o que deveria aparecer com detalhes (ex: "homem musculoso fitness com camiseta preta em academia moderna, iluminação dramática", "embalagem de suplemento proteico em fundo escuro")
  - "searchTerms": Array de termos para buscar fotos de referência na web (ex: ["Toguro fitness", "Cimed logo", "suplemento proteico"]). Inclua nomes reais de pessoas e marcas mencionadas.
  - "needsImage": boolean - true se este card precisa de imagem baseado no conteúdo
- Card ${numCards} (cta): CTA + mensagem motivacional

${imageCardIndices.length > 0 ? `IMPORTANTE: Os cards nas posições ${imageCardIndices.join(', ')} DEVEM ter imagens (needsImage=true). Os demais podem ser somente texto.` : ''}

IMPORTANTE sobre imagePrompt e searchTerms:
- Se o tópico menciona PESSOAS REAIS (celebridades, influenciadores), inclua o nome deles em searchTerms para buscar fotos de referência
- Se menciona MARCAS, inclua o nome + "logo" ou "produto" em searchTerms
- imagePrompt deve descrever a cena visual detalhadamente (iluminação, composição, estilo)
- searchTerms são para buscar referências reais na web

Responda APENAS em JSON válido:
{
  "title": "título do carrossel",
  "cards": [
    {
      "type": "cover",
      "title": "TÍTULO IMPACTANTE EM CAIXA ALTA",
      "subtitle": "Subtítulo descritivo curto",
      "imagePrompt": "descrição visual para imagem de capa",
      "searchTerms": ["termo1", "termo2"],
      "needsImage": true
    },
    {
      "type": "content",
      "bodyTop": "Parágrafo principal com **trechos destacados** em negrito...",
      "bodyBottom": "Segundo parágrafo complementar...",
      "imagePrompt": "descrição visual para imagem do card",
      "searchTerms": ["termo de busca"],
      "needsImage": true
    },
    {
      "type": "cta",
      "title": "Gostou do conteúdo?",
      "body": "Salve, compartilhe e siga para mais!",
      "imagePrompt": "descrição visual para CTA",
      "searchTerms": [],
      "needsImage": false
    }
  ]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Tópico: ${topic}\nPalavras-chave: ${(keywords || []).join(', ')}` },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('AI Gateway error:', response.status, errText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Tente novamente em alguns segundos.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Erro ao gerar conteúdo' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        parsed = null;
      }

      if (!parsed) {
        return new Response(JSON.stringify({ error: 'Não foi possível processar o conteúdo gerado', raw: content }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, data: parsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== GENERATE AI IMAGE (Lovable AI - Gemini) =====
    if (action === 'generate-ai-image') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const imagePrompt = prompt || topic || 'abstract background';
      const hasFaceRefs = faceReferenceUrls && faceReferenceUrls.length > 0;
      const hasStyleRefs = styleReferenceUrls && styleReferenceUrls.length > 0;
      const hasGeneralRefs = referenceImageUrls && referenceImageUrls.length > 0;

      // Build message content with text + optional reference images
      const messageContent: any[] = [];

      // Build detailed text prompt
      let textPrompt = `Generate a professional editorial magazine-quality photo for an Instagram carousel post (4:5 portrait aspect ratio, 1080x1350px).

DESCRIPTION: ${imagePrompt}

STYLE REQUIREMENTS:
- Cinematic lighting with dramatic shadows
- High-end editorial/magazine aesthetic
- Rich colors and professional color grading
- Clean composition suitable for overlay text
- Ultra high resolution, photorealistic quality`;

      if (hasFaceRefs) {
        textPrompt += `\n\nIMPORTANT - FACE CONSISTENCY: The person(s) in the attached reference photos MUST appear in this image. Maintain their exact facial features, skin tone, and likeness. This is critical for brand consistency across the carousel.`;
      }

      if (hasStyleRefs) {
        textPrompt += `\n\nDESIGN STYLE REFERENCE: Use the attached style reference images as inspiration for the visual composition, color palette, and overall aesthetic. Match the design style but create original content.`;
      }

      messageContent.push({ type: 'text', text: textPrompt });

      // Add face reference images (priority - first)
      if (hasFaceRefs) {
        for (const refUrl of faceReferenceUrls.slice(0, 3)) {
          messageContent.push({ type: 'image_url', image_url: { url: refUrl } });
        }
      }

      // Add style reference images
      if (hasStyleRefs) {
        for (const refUrl of styleReferenceUrls.slice(0, 2)) {
          messageContent.push({ type: 'image_url', image_url: { url: refUrl } });
        }
      }

      // Add general reference images
      if (hasGeneralRefs && !hasFaceRefs && !hasStyleRefs) {
        for (const refUrl of referenceImageUrls.slice(0, 3)) {
          messageContent.push({ type: 'image_url', image_url: { url: refUrl } });
        }
      }

      console.log('Generating image with Gemini, refs:', { hasFaceRefs, hasStyleRefs, hasGeneralRefs });

      const genResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [{ role: 'user', content: messageContent }],
          modalities: ['image', 'text'],
        }),
      });

      if (!genResponse.ok) {
        const errText = await genResponse.text();
        console.error('Gemini image gen error:', genResponse.status, errText);
        if (genResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (genResponse.status === 402) {
          return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Erro ao gerar imagem com IA' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const genData = await genResponse.json();
      const generatedImage = genData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImage) {
        console.error('No image in Gemini response:', JSON.stringify(genData).slice(0, 500));
        return new Response(JSON.stringify({ error: 'Nenhuma imagem foi gerada' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, imageUrl: generatedImage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== SEARCH IMAGES (Pexels) =====
    if (action === 'search-images') {
      const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
      if (!PEXELS_API_KEY) {
        return new Response(JSON.stringify({ error: 'PEXELS_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const searchQuery = query || keywords?.join(' ') || topic;
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=15&orientation=square`,
        { headers: { 'Authorization': PEXELS_API_KEY } }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('Pexels error:', response.status, errText);
        return new Response(JSON.stringify({ error: 'Erro ao buscar imagens' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const images = (data.photos || []).map((p: any) => ({
        id: p.id,
        url: p.src.large2x || p.src.large,
        thumb: p.src.medium,
        alt: p.alt || '',
        photographer: p.photographer,
      }));

      return new Response(JSON.stringify({ success: true, images }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-carousel error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
