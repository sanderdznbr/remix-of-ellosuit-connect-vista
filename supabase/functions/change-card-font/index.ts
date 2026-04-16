// Edge function: Change font style on a generated card image
// Uses a better model and strict prompt for dimension/quality preservation

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
          model: 'google/gemini-3-pro-image-preview',
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
      if (res.status === 402) throw new Error('PAYMENT_REQUIRED');

      if (!res.ok) {
        const errText = await res.text();
        console.error(`AI call failed [${res.status}]:`, errText.slice(0, 300));
        if (attempt < retries) continue;
        throw new Error(`AI_ERROR_${res.status}`);
      }

      const raw = await res.text();
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
      if (attempt < retries && !(e instanceof Error && (e.message === 'RATE_LIMIT' || e.message === 'PAYMENT_REQUIRED'))) continue;
      throw e;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { imageUrl, fontReference, fontPreviewUrl } = body;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`=== CHANGE FONT === Font: ${fontReference || 'custom'}`);

    // Determine font style description
    let fontStyleDesc = 'uma tipografia moderna e diferente da original';
    if (fontReference) {
      const name = fontReference.toLowerCase();
      if (['playfair', 'merriweather', 'lora', 'garamond', 'crimson', 'baskerville', 'serif'].some(k => name.includes(k))) {
        fontStyleDesc = `tipografia serifada elegante no estilo "${fontReference}" — com serifas refinadas, contraste alto entre traços grossos e finos, aspecto clássico e sofisticado`;
      } else if (['bebas', 'oswald', 'anton', 'archivo', 'impact'].some(k => name.includes(k))) {
        fontStyleDesc = `tipografia bold condensada no estilo "${fontReference}" — letras altas e estreitas, peso pesado, impactante e chamativa`;
      } else if (['space grotesk', 'sora', 'outfit', 'clash'].some(k => name.includes(k))) {
        fontStyleDesc = `tipografia geométrica moderna no estilo "${fontReference}" — formas limpas, geométricas, contemporânea e tech`;
      } else {
        fontStyleDesc = `tipografia no estilo "${fontReference}" — mantenha as características visuais distintas dessa família tipográfica`;
      }
    }

    const contentParts: any[] = [];

    contentParts.push({
      type: 'text',
      text: `TAREFA: Edite APENAS a tipografia/fonte dos textos nesta imagem de post para Instagram.

INSTRUÇÃO PRINCIPAL:
Leia todos os textos visíveis na imagem original. Remova-os (preencha com o fundo natural por trás) e reescreva EXATAMENTE os mesmos textos, nas MESMAS posições, com EXATAMENTE o mesmo tamanho, cor e alinhamento — mas usando uma tipografia diferente.

NOVA TIPOGRAFIA: ${fontStyleDesc}

REGRAS ABSOLUTAS — VIOLAÇÃO = FALHA:
1. DIMENSÕES: A imagem de saída DEVE ter EXATAMENTE as mesmas dimensões (pixels) da imagem de entrada. NÃO redimensione, NÃO corte, NÃO faça zoom.
2. FUNDO INTOCÁVEL: Fotos, pessoas, elementos gráficos, cores de fundo, gradientes, formas decorativas — tudo DEVE permanecer PIXEL A PIXEL idêntico. Mude APENAS as letras/textos.
3. POSIÇÃO DOS TEXTOS: Cada bloco de texto deve estar na MESMA posição (x, y) da imagem original. NÃO mova textos para cima, baixo, esquerda ou direita.
4. CONTEÚDO DOS TEXTOS: Copie CARACTERE POR CARACTERE. NÃO altere, NÃO resuma, NÃO adicione palavras.
5. TAMANHO DOS TEXTOS: Mantenha o MESMO tamanho relativo de cada bloco de texto. Título grande continua grande, corpo pequeno continua pequeno.
6. COR DOS TEXTOS: Mantenha as mesmas cores (branco continua branco, colorido continua colorido).
7. QUALIDADE: Mantenha a mesma resolução e nitidez. NÃO comprima, NÃO degrade a qualidade.
8. NÃO adicione bordas, molduras, marcas d'água ou qualquer elemento novo.

A ÚNICA diferença entre a imagem original e a nova deve ser o DESENHO/ESTILO das letras (a família tipográfica).`
    });

    contentParts.push({
      type: 'image_url',
      image_url: { url: imageUrl }
    });

    if (fontPreviewUrl) {
      contentParts.push({
        type: 'text',
        text: 'Referência visual da tipografia desejada (use este estilo de letras):'
      });
      contentParts.push({
        type: 'image_url',
        image_url: { url: fontPreviewUrl }
      });
    }

    const result = await callAI(LOVABLE_API_KEY, [
      { role: 'user', content: contentParts }
    ]);

    if (!result) {
      return new Response(JSON.stringify({ error: 'Falha ao processar a mudança de fonte' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== CHANGE FONT === Complete!');

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('change-card-font error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    
    if (msg === 'RATE_LIMIT') {
      return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (msg === 'PAYMENT_REQUIRED') {
      return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos em Configurações.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
