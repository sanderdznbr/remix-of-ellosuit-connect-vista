// Edge function: 3-step AI pipeline for real estate cards
// Step 1: Generate overlay (text, specs, elements) on solid black background
// Step 2: Remove black background → transparent overlay
// Step 3: Composite overlay onto real property photo

import { requireAuthenticatedUser } from "../_shared/requireAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function callAI(apiKey: string, messages: any[], retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages,
          modalities: ['image', 'text'],
        }),
      });

      if (res.status === 429) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        throw new Error('RATE_LIMIT');
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`AI call failed [${res.status}]:`, errText.slice(0, 300));
        if (attempt < retries) continue;
        throw new Error(`AI_ERROR_${res.status}`);
      }

      const raw = await res.text();
      // Extract base64 image from response
      const patterns = ['"url":"data:image/', '"url": "data:image/'];
      for (const pattern of patterns) {
        const idx = raw.indexOf(pattern);
        if (idx === -1) continue;
        const urlStart = raw.indexOf('"', idx + 5) + 1;
        const urlEnd = raw.indexOf('"', urlStart);
        if (urlEnd === -1) continue;
        return raw.slice(urlStart, urlEnd);
      }
      
      console.error('No image found in AI response');
      if (attempt < retries) continue;
      return null;
    } catch (e) {
      if (attempt < retries && !(e instanceof Error && e.message === 'RATE_LIMIT')) continue;
      throw e;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuthenticatedUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      propertyPhoto, // base64 or URL of the real property photo
      propertyData,  // { price, area, bedrooms, bathrooms, parking, location, neighborhood, title, type, mode, highlights }
      cardType,      // 'cover' | 'content' | 'cta'
      cardIndex,
      totalCards,
      accentColor,
      brandName,
      userName,
      logoPosition,
      fontStyle,     // 'modern' | 'classic' | 'bold'
      step,          // optional: 1, 2, or 3 to run individual steps (default: all 3)
      overlayImage,  // optional: for step 3 only, the overlay from step 1-2
    } = body;

    if (!propertyPhoto && step !== 1 && step !== 2) {
      return new Response(JSON.stringify({ error: 'propertyPhoto is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prop = propertyData || {};
    const accent = accentColor || '#D4AF37';
    const brand = brandName || '';
    const user = userName || '';
    const type = cardType || 'content';
    const idx = cardIndex ?? 0;
    const total = totalCards ?? 1;

    // Build property specs text
    const specs: string[] = [];
    if (prop.area) specs.push(`${prop.area}m²`);
    if (prop.bedrooms) specs.push(`${prop.bedrooms} Quartos`);
    if (prop.suites) specs.push(`${prop.suites} Suítes`);
    if (prop.bathrooms) specs.push(`${prop.bathrooms} Banheiros`);
    if (prop.parking) specs.push(`${prop.parking} Vagas`);
    const specsText = specs.join(' | ');

    const priceFormatted = prop.price
      ? parseFloat(prop.price.toString().replace(/[^\d.,]/g, '').replace(',', '.'))
          .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
      : '';

    const modeLabel = prop.mode === 'rent' ? 'Aluguel' : 'Venda';
    const locationText = [prop.neighborhood, prop.location].filter(Boolean).join(' · ');

    console.log(`=== REAL ESTATE CARD GEN === Card ${idx + 1}/${total}, type: ${type}`);

    // ═══════════════════════════════════════════════════════
    // STEP 1: Generate overlay design on SOLID BLACK background
    // ═══════════════════════════════════════════════════════
    
    const buildOverlayPrompt = () => {
      const baseRules = `REGRAS ABSOLUTAS:
- Fundo PRETO SÓLIDO PURO (#000000) em 100% da imagem. NENHUMA foto, textura ou gradiente no fundo.
- Formato 3:4 (1080x1350 pixels).
- Todos os elementos visuais devem ser em CORES CLARAS que contrastem com o fundo preto.
- Use a cor de destaque ${accent} para ícones, badges e detalhes decorativos.
- Tipografia profissional e elegante, limpa e moderna.
- IDIOMA: Português brasileiro.
- NÃO inclua nenhuma foto ou imagem de imóvel/casa — APENAS elementos gráficos, texto e ícones.`;

      if (type === 'cover') {
        return `Crie um OVERLAY de design para card imobiliário de Instagram em fundo PRETO SÓLIDO.

${baseRules}

ELEMENTOS A INCLUIR:
- Badge "${modeLabel}" no canto superior (pequeno, elegante)
${priceFormatted ? `- Preço "${priceFormatted}" em destaque grande e impactante${prop.mode === 'rent' ? ' com "/mês"' : ''}` : ''}
${prop.title ? `- Título "${prop.title}" em tipografia grande` : ''}
${locationText ? `- Localização "${locationText}" com ícone de pin` : ''}
- Card de informações com ícones:
${specsText ? `  ${specsText}` : '  3 Quartos | 2 Banheiros | 120m² | 2 Vagas'}
${brand ? `- Nome da marca "${brand}" discreto` : ''}
- Elementos decorativos sutis (linhas, formas geométricas) na cor ${accent}
- Layout profissional estilo imobiliária premium

IMPORTANTE: O fundo DEVE ser 100% preto sólido (#000000). Os elementos de texto e ícones serão extraídos e sobrepostos em uma foto real.`;
      }

      if (type === 'cta') {
        return `Crie um OVERLAY de design para card de CTA imobiliário em fundo PRETO SÓLIDO.

${baseRules}

ELEMENTOS A INCLUIR:
- Título "Agende sua Visita" ou "Fale Conosco" em tipografia grande
${brand ? `- Nome da marca "${brand}"` : ''}
${user ? `- @${user}` : ''}
- Botão estilizado com texto "Fale Conosco" ou "Agendar Visita" na cor ${accent}
- Ícone de telefone ou WhatsApp
${priceFormatted ? `- Preço "${priceFormatted}" como referência` : ''}
- Layout centrado e impactante
- Elementos decorativos na cor ${accent}

IMPORTANTE: O fundo DEVE ser 100% preto sólido (#000000).`;
      }

      // Content card
      return `Crie um OVERLAY de design para card de conteúdo imobiliário em fundo PRETO SÓLIDO.

${baseRules}

ELEMENTOS A INCLUIR:
${prop.title ? `- Título "${prop.title}"` : '- Título "Detalhes do Imóvel"'}
- Card de especificações com ícones elegantes:
${specsText ? `  ${specsText}` : '  Área | Quartos | Banheiros | Vagas'}
${priceFormatted ? `- Preço "${priceFormatted}" em destaque${prop.mode === 'rent' ? ' com "/mês"' : ''}` : ''}
${locationText ? `- Localização "${locationText}" com ícone` : ''}
${prop.highlights ? `- Destaque: "${prop.highlights.split(',')[0]?.trim()}"` : ''}
- Badge "${modeLabel}" 
${brand ? `- Marca "${brand}" discreta` : ''}
- Layout editorial profissional, variado do card de capa
- Elementos decorativos sutis na cor ${accent}

IMPORTANTE: O fundo DEVE ser 100% preto sólido (#000000). Card ${idx + 1} de ${total}.`;
    };

    let overlayImageUrl: string | null = overlayImage || null;

    if (!overlayImageUrl || step === 1) {
      console.log('Step 1: Generating overlay on black background...');
      const overlayPrompt = buildOverlayPrompt();
      
      overlayImageUrl = await callAI(LOVABLE_API_KEY, [
        { role: 'user', content: overlayPrompt }
      ]);

      if (!overlayImageUrl) {
        return new Response(JSON.stringify({ error: 'Failed to generate overlay (Step 1)' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('Step 1 complete: overlay generated');

      if (step === 1) {
        return new Response(JSON.stringify({ success: true, step: 1, overlayImage: overlayImageUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2 + 3 COMBINED: Composite overlay onto property photo
    // Instead of removing bg separately, we ask AI to merge them directly
    // This is more reliable than transparent PNG extraction
    // ═══════════════════════════════════════════════════════

    console.log('Step 2+3: Compositing overlay onto property photo...');

    const compositeMessages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Você tem DUAS imagens:
1. OVERLAY (primeira imagem): Um design com textos, ícones e elementos gráficos em fundo PRETO. 
2. FOTO DO IMÓVEL (segunda imagem): Uma fotografia REAL de um imóvel.

TAREFA: Crie uma NOVA imagem que:
- Use a FOTO DO IMÓVEL como fundo em TELA CHEIA (full bleed, 100% do canvas)
- EXTRAIA todos os elementos de texto, ícones, badges e gráficos do OVERLAY
- SOBREPONHA esses elementos sobre a foto do imóvel
- Adicione gradientes sutis (escurecimento nas bordas/base) para legibilidade do texto
- Mantenha TODOS os textos, preços, ícones e especificações EXATAMENTE como estão no overlay
- A foto do imóvel deve ser claramente visível e reconhecível por trás dos elementos
- Formato: 3:4 (1080x1350), full bleed, sem bordas

REGRAS CRÍTICAS:
- NÃO altere os textos do overlay — copie-os EXATAMENTE
- NÃO substitua a foto do imóvel por outra — use EXATAMENTE a foto fornecida
- NÃO adicione molduras, bordas ou frames
- O resultado deve parecer uma arte profissional de imobiliária com a foto real como fundo
- Aplique um gradiente escuro sutil na base (30-40% da imagem) para dar legibilidade aos textos
- Mantenha a cor de destaque ${accent} nos ícones e elementos decorativos`
          },
          {
            type: 'image_url',
            image_url: { url: overlayImageUrl }
          },
          {
            type: 'image_url',
            image_url: { url: propertyPhoto }
          }
        ]
      }
    ];

    const finalImage = await callAI(LOVABLE_API_KEY, compositeMessages);

    if (!finalImage) {
      // Fallback: return overlay image if compositing fails
      console.error('Compositing failed, returning overlay as fallback');
      return new Response(JSON.stringify({ 
        success: true, 
        imageUrl: overlayImageUrl, 
        fallback: true,
        step: 'composite_failed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Step 2+3 complete: final composite generated');

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: finalImage,
      overlayImage: overlayImageUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('generate-realestate-card error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    
    if (msg === 'RATE_LIMIT') {
      return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
