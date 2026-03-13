const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, url, urls, query, limit } = body;

    // ====== ACTION: search Behance projects by query ======
    if (action === 'search' && query) {
      const maxResults = Math.min(limit || 8, 12);
      
      const extractImages = (html: string, max: number) => {
        const results: { imageUrl: string; title: string; projectUrl: string }[] = [];
        const seen = new Set<string>();
        let match;
        const coverRegex = /src="(https:\/\/mir-s3-cdn-cf\.behance\.net\/project[s_]?[^"]*\/(404|808|max_[0-9]+|1400|disp|fs)\/[^"]+)"/g;
        while ((match = coverRegex.exec(html)) !== null && results.length < max) {
          const imgUrl = match[1].split('?')[0];
          const fileKey = imgUrl.split('/').pop() || imgUrl;
          if (!seen.has(fileKey)) { seen.add(fileKey); results.push({ imageUrl: imgUrl, title: '', projectUrl: '' }); }
        }
        if (results.length < max) {
          const moduleRegex = /src="(https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"]+)"/g;
          while ((match = moduleRegex.exec(html)) !== null && results.length < max) {
            const imgUrl = match[1].split('?')[0];
            const fileKey = imgUrl.split('/').pop() || imgUrl;
            if (!seen.has(fileKey)) { seen.add(fileKey); results.push({ imageUrl: imgUrl, title: '', projectUrl: '' }); }
          }
        }
        if (results.length < max) {
          const srcsetRegex = /srcset="([^"]*mir-s3-cdn-cf\.behance\.net[^"]+)"/g;
          while ((match = srcsetRegex.exec(html)) !== null && results.length < max) {
            const parts = match[1].split(',').map((p: string) => p.trim().split(' ')[0]).filter((u: string) => u?.startsWith('https://'));
            const bestUrl = parts[parts.length - 1];
            if (bestUrl) {
              const fileKey = bestUrl.split('/').pop() || bestUrl;
              if (!seen.has(fileKey)) { seen.add(fileKey); results.push({ imageUrl: bestUrl, title: '', projectUrl: '' }); }
            }
          }
        }
        if (results.length < max) {
          const anyImgRegex = /src="(https:\/\/mir-s3-cdn-cf\.behance\.net\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/gi;
          while ((match = anyImgRegex.exec(html)) !== null && results.length < max) {
            const imgUrl = match[1].split('?')[0];
            const fileKey = imgUrl.split('/').pop() || imgUrl;
            if (!seen.has(fileKey) && !imgUrl.includes('/avatars/') && !imgUrl.includes('/user/')) {
              seen.add(fileKey); results.push({ imageUrl: imgUrl, title: '', projectUrl: '' });
            }
          }
        }
        return results;
      };

      const searchVariants = [
        `https://www.behance.net/search/projects?search=${encodeURIComponent(query.trim())}&sort=appreciations&time=all`,
        `https://www.behance.net/search/projects?search=${encodeURIComponent(query.trim())}&sort=recommended`,
        `https://www.behance.net/search/images?search=${encodeURIComponent(query.trim())}&sort=appreciations`,
      ];
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      };

      let allResults: { imageUrl: string; title: string; projectUrl: string }[] = [];
      for (const searchUrl of searchVariants) {
        if (allResults.length >= maxResults) break;
        console.log('Trying Behance search:', searchUrl);
        try {
          const resp = await fetch(searchUrl, { headers });
          if (!resp.ok) { console.warn('Search variant failed:', resp.status); continue; }
          const html = await resp.text();
          const found = extractImages(html, maxResults - allResults.length);
          const existingKeys = new Set(allResults.map(r => r.imageUrl.split('/').pop()));
          for (const item of found) {
            const key = item.imageUrl.split('/').pop();
            if (!existingKeys.has(key)) { allResults.push(item); existingKeys.add(key); }
          }
        } catch (e) { console.warn('Search variant error:', e); }
      }

      console.log(`Behance search found ${allResults.length} total images for "${query}"`);
      return new Response(
        JSON.stringify({ results: allResults.slice(0, maxResults), count: Math.min(allResults.length, maxResults), query }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ====== ACTION: download images via proxy ======
    if (action === 'download' && Array.isArray(urls)) {
      console.log(`Proxying download for ${urls.length} images`);
      const results: { base64: string; mimeType: string }[] = [];

      for (const imgUrl of urls.slice(0, 20)) {
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

    // ====== DEFAULT: scrape gallery for image URLs ======
    if (!url || !url.includes('behance.net/gallery/')) {
      return new Response(
        JSON.stringify({ error: 'URL de galeria do Behance inválida ou ação não reconhecida' }),
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

    const galleryImageUrls: string[] = [];
    const seen = new Set<string>();

    const pushUrl = (imgUrl: string) => {
      const fileKey = imgUrl.split('?')[0].split('/').pop() || imgUrl;
      if (!seen.has(fileKey)) {
        seen.add(fileKey);
        galleryImageUrls.push(imgUrl);
      }
    };

    const pushFromSrcset = (srcset: string) => {
      for (const part of srcset.split(',')) {
        const token = part.trim().split(' ')[0];
        if (token?.startsWith('https://')) pushUrl(token);
      }
    };

    const webpSourceRegex = /<source[^>]*data-ut="project-module-source-webp"[^>]*srcset="([^"]+)"/g;
    let match;
    while ((match = webpSourceRegex.exec(html)) !== null) {
      pushFromSrcset(match[1]);
    }

    const srcsetRegex = /srcset="(https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"]+)"/g;
    while ((match = srcsetRegex.exec(html)) !== null) {
      pushFromSrcset(match[1]);
    }

    const imgSrcRegex = /src="(https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"]+)"/g;
    while ((match = imgSrcRegex.exec(html)) !== null) {
      pushUrl(match[1]);
    }

    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' on Behance', '').trim() : 'Behance Gallery';

    console.log(`Found ${galleryImageUrls.length} images in gallery: ${title}`);

    return new Response(
      JSON.stringify({ title, images: galleryImageUrls, count: galleryImageUrls.length }),
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