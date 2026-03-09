const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, url, urls } = body;

    // Action: download images via proxy (server-side, no CORS restrictions)
    if (action === 'download' && Array.isArray(urls)) {
      console.log(`Proxying download for ${urls.length} images`);
      const results: { base64: string; mimeType: string }[] = [];

      for (const imgUrl of urls.slice(0, 20)) { // max 20
        try {
          const resp = await fetch(imgUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'image/*',
              'Referer': 'https://www.behance.net/',
            },
          });
          if (!resp.ok) continue;

          const buffer = await resp.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);

          const contentType = resp.headers.get('content-type') || 'image/jpeg';
          results.push({ base64, mimeType: contentType });
        } catch (e) {
          console.warn('Failed to download:', imgUrl, e);
        }
      }

      return new Response(
        JSON.stringify({ images: results, count: results.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default action: scrape gallery for image URLs
    if (!url || !url.includes('behance.net/gallery/')) {
      return new Response(
        JSON.stringify({ error: 'URL de galeria do Behance inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Behance gallery:', url);

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!resp.ok) {
      console.error('Failed to fetch Behance page:', resp.status);
      return new Response(
        JSON.stringify({ error: `Falha ao acessar a página (${resp.status})` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await resp.text();

    // Extract image URLs from srcset attributes in project module pictures
    // Pattern: mir-s3-cdn-cf.behance.net/project_modules/...
    const imageUrls: string[] = [];
    const seen = new Set<string>();

    // Prefer: <source data-ut="project-module-source-webp" srcset="...">
    const imageUrls: string[] = [];
    const seen = new Set<string>();

    const pushUrl = (raw: string) => {
      const imgUrl = raw.split(' ')[0]; // remove width descriptor like "1080w"
      const fileKey = imgUrl.split('/').pop() || imgUrl;
      if (!seen.has(fileKey)) {
        seen.add(fileKey);
        imageUrls.push(imgUrl);
      }
    };

    const webpSourceRegex = /<source[^>]*data-ut="project-module-source-webp"[^>]*srcset="([^"]+)"/g;
    let match;
    while ((match = webpSourceRegex.exec(html)) !== null) {
      pushUrl(match[1]);
    }

    // Fallback: any srcset URLs pointing to project_modules
    const srcsetRegex = /srcset="(https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"]+)"/g;
    while ((match = srcsetRegex.exec(html)) !== null) {
      pushUrl(match[1]);
    }

    // Fallback: img src URLs
    const imgSrcRegex = /src="(https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"]+)"/g;
    while ((match = imgSrcRegex.exec(html)) !== null) {
      pushUrl(match[1]);
    }

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' on Behance', '').trim() : 'Behance Gallery';

    console.log(`Found ${imageUrls.length} images in gallery: ${title}`);

    return new Response(
      JSON.stringify({ title, images: imageUrls, count: imageUrls.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Behance scraper error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao processar' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
