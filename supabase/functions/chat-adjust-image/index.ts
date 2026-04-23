// Edits an existing generated post image based on a user instruction.
// Uses Gemini image edit (nano-banana) and updates the carousel record.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || 'image/png';
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:${ct};base64,${btoa(bin)}`;
  } catch { return null; }
}

async function extractImage(resp: Response): Promise<string | null> {
  const raw = await resp.text();
  const patterns = ['"url":"data:image/', '"url": "data:image/', '"url":"http', '"url": "http'];
  for (const p of patterns) {
    const idx = raw.indexOf(p);
    if (idx === -1) continue;
    const isHttp = p.includes('http');
    const start = isHttp ? raw.indexOf('http', idx) : raw.indexOf('data:image/', idx);
    const end = raw.indexOf('"', start);
    if (start !== -1 && end !== -1) return raw.slice(start, end);
  }
  console.error('extract failed:', raw.slice(0, 400));
  return null;
}

async function uploadCover(sb: any, companyId: string, carouselId: string, dataUrl: string): Promise<string | null> {
  try {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const path = `${companyId}/${carouselId}/cover.jpg`;
    const { error } = await sb.storage.from('covers').upload(path, bytes.buffer, {
      contentType: 'image/jpeg', upsert: true,
    });
    if (error) { console.error('upload error:', error); return null; }
    const { data } = sb.storage.from('covers').getPublicUrl(path);
    return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null;
  } catch (e) { console.error('upload exc:', e); return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const sbAuth = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sbAuth.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { carouselId, instruction } = await req.json();
    if (!carouselId || !instruction) {
      return new Response(JSON.stringify({ error: 'carouselId e instruction são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: car, error: carErr } = await sb
      .from('generated_carousels')
      .select('id, company_id, carousel_data, cover_url, title')
      .eq('id', carouselId)
      .maybeSingle();
    if (carErr || !car) {
      return new Response(JSON.stringify({ error: 'Post não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cards = (car.carousel_data as any)?.cards || [];
    const currentImage = car.cover_url || cards[0]?.imageUrl;
    if (!currentImage) {
      return new Response(JSON.stringify({ error: 'Imagem original não encontrada' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imgData = currentImage.startsWith('data:') ? currentImage : await urlToDataUrl(currentImage);
    if (!imgData) throw new Error('Falha ao carregar imagem');

    const editPrompt = `Edit this Instagram post image based on the user's request. KEEP the same overall composition, style, brand, person identity (if any) and typography quality. Only modify what is asked.

USER REQUEST: "${instruction}"

Output: a polished, ready-to-publish image, same aspect ratio as input. Keep all text in português brasileiro. Do NOT add watermarks.`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: editPrompt },
            { type: 'image_url', image_url: { url: imgData } },
          ],
        }],
        modalities: ['image', 'text'],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições atingido.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos esgotados.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error('edit ai error:', resp.status, t);
      return new Response(JSON.stringify({ error: 'Falha ao ajustar a imagem' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newImage = await extractImage(resp);
    if (!newImage) {
      return new Response(JSON.stringify({ error: 'IA não retornou imagem.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const coverUrl = await uploadCover(sb, car.company_id, car.id, newImage);
    const finalUrl = coverUrl || newImage;

    const updatedCards = cards.length
      ? cards.map((c: any, i: number) => i === 0 ? { ...c, imageUrl: finalUrl } : c)
      : [{ type: 'cover', title: car.title, imageUrl: finalUrl, isAiImage: true, layout: 'dark' }];

    await sb.from('generated_carousels').update({
      cover_url: finalUrl,
      carousel_data: { ...(car.carousel_data as any), cards: updatedCards },
    }).eq('id', car.id);

    return new Response(JSON.stringify({ imageUrl: finalUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('chat-adjust-image error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
