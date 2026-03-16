const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const IG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};

/**
 * Extract username from a profile URL like instagram.com/walksbr/
 */
function extractUsername(url: string): string | null {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?(\?.*)?$/);
  if (!match) return null;
  const name = match[1].toLowerCase();
  // Exclude known non-profile paths
  if (['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'about', 'directory', 'developer'].includes(name)) return null;
  return name;
}

/**
 * Scrape a profile page to get recent post thumbnails and shortcodes
 */
async function scrapeProfile(username: string) {
  console.log('Scraping profile:', username);

  // Try the web profile page
  const profileUrl = `https://www.instagram.com/${username}/`;
  const resp = await fetch(profileUrl, { headers: IG_HEADERS, redirect: 'follow' });

  if (!resp.ok) {
    throw new Error(`Perfil não encontrado ou é privado (${resp.status})`);
  }

  const html = await resp.text();

  // Check if profile is private
  if (html.includes('"is_private":true') && !html.includes('"followed_by_viewer":true')) {
    throw new Error('Este perfil é privado. Só é possível importar de perfis públicos.');
  }

  // Extract posts from the HTML/JSON data
  const posts: { shortcode: string; thumbnail: string; caption: string; isVideo: boolean }[] = [];
  const seen = new Set<string>();

  // Strategy 1: Look for shortcodes and thumbnails in JSON embedded data
  // Instagram embeds _sharedData or similar JSON with post info
  const shortcodeRegex = /"shortcode"\s*:\s*"([A-Za-z0-9_-]+)"/g;
  let match;
  const shortcodes: string[] = [];
  while ((match = shortcodeRegex.exec(html)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      shortcodes.push(match[1]);
    }
  }

  // Extract display_url / thumbnail_src pairs near each shortcode
  for (const sc of shortcodes) {
    // Find the closest display_url or thumbnail near this shortcode in the JSON
    const scIndex = html.indexOf(`"shortcode":"${sc}"`);
    if (scIndex < 0) continue;

    // Look in a window around the shortcode
    const window = html.substring(Math.max(0, scIndex - 500), Math.min(html.length, scIndex + 2000));

    // Get thumbnail URL
    const thumbMatch = window.match(/"thumbnail_src"\s*:\s*"([^"]+)"/) ||
                       window.match(/"display_url"\s*:\s*"([^"]+)"/) ||
                       window.match(/"src"\s*:\s*"(https:\/\/[^"]*cdninstagram[^"]*)"/) ;

    const captionMatch = window.match(/"text"\s*:\s*"([^"]{0,100})/);
    const isVideo = window.includes('"is_video":true');

    if (thumbMatch) {
      const thumbUrl = thumbMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      posts.push({
        shortcode: sc,
        thumbnail: thumbUrl,
        caption: captionMatch ? captionMatch[1].replace(/\\n/g, ' ').substring(0, 80) : '',
        isVideo,
      });
    }
  }

  // Strategy 2: If we found shortcodes but no thumbnails, try og:image as fallback
  if (posts.length === 0 && shortcodes.length > 0) {
    // At least return shortcodes so the user can click through
    for (const sc of shortcodes.slice(0, 30)) {
      posts.push({
        shortcode: sc,
        thumbnail: '',
        caption: '',
        isVideo: false,
      });
    }
  }

  // Extract profile info
  const nameMatch = html.match(/"full_name"\s*:\s*"([^"]+)"/) ||
                    html.match(/<title>([^<(]+)/);
  const profileName = nameMatch ? nameMatch[1].trim() : username;

  const profilePicMatch = html.match(/"profile_pic_url(?:_hd)?"\s*:\s*"([^"]+)"/);
  const profilePic = profilePicMatch ? profilePicMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/') : '';

  console.log(`Found ${posts.length} posts for profile @${username}`);

  return {
    username,
    profileName,
    profilePic,
    posts: posts.slice(0, 30), // Limit to 30 most recent
  };
}

/**
 * Scrape a single post page for high-res images
 */
async function scrapePost(url: string) {
  console.log('Fetching Instagram post:', url);

  let cleanUrl = url.split('?')[0];
  if (!cleanUrl.endsWith('/')) cleanUrl += '/';

  const resp = await fetch(cleanUrl, { headers: IG_HEADERS, redirect: 'follow' });

  if (!resp.ok) {
    throw new Error(`Falha ao acessar o post (${resp.status}). O post pode ser privado.`);
  }

  const html = await resp.text();
  const galleryImageUrls: string[] = [];
  const seen = new Set<string>();

  const pushUrl = (imgUrl: string) => {
    const clean = imgUrl.split('&amp;').join('&');
    const key = clean.split('?')[0];
    if (!seen.has(key) && !key.includes('s150x150') && !key.includes('s320x320')) {
      seen.add(key);
      galleryImageUrls.push(clean);
    }
  };

  // Strategy 1: meta og:image
  const ogImageRegex = /<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/gi;
  let match;
  while ((match = ogImageRegex.exec(html)) !== null) {
    pushUrl(match[1].replace(/&amp;/g, '&'));
  }

  // Strategy 2: CDN URLs in embedded JSON
  const cdnUrlRegex = /https:\/\/[^"'\s]*?(?:cdninstagram|instagram)[^"'\s]*?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]*)?/gi;
  while ((match = cdnUrlRegex.exec(html)) !== null) {
    const decoded = match[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
    if (decoded.includes('1080') || decoded.includes('1440') || decoded.includes('750x') ||
        decoded.includes('/p/') || decoded.includes('e35') || decoded.includes('e15')) {
      pushUrl(decoded);
    }
  }

  // Strategy 3: all CDN images as fallback
  if (galleryImageUrls.length === 0) {
    const allCdnRegex = /https:\/\/[^"'\s\\]*?(?:cdninstagram|instagram\.f)[^"'\s\\]*?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s\\]*)?/gi;
    while ((match = allCdnRegex.exec(html)) !== null) {
      const decoded = match[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
      pushUrl(decoded);
    }
  }

  const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i) ||
                     html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(/ \| Instagram$/, '').trim() : 'Post do Instagram';

  console.log(`Found ${galleryImageUrls.length} images in Instagram post: ${title}`);

  return { title, images: galleryImageUrls };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, url, urls } = body;

    // Action: download images via proxy (avoids CORS)
    if (action === 'download' && Array.isArray(urls)) {
      console.log(`Proxying download for ${urls.length} Instagram images`);
      const results: { base64: string; mimeType: string }[] = [];

      for (const imgUrl of urls.slice(0, 20)) {
        try {
          const resp = await fetch(imgUrl, {
            headers: {
              'User-Agent': IG_HEADERS['User-Agent'],
              'Accept': 'image/*',
              'Referer': 'https://www.instagram.com/',
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

    // Action: scrape profile
    if (action === 'profile' && url) {
      const username = extractUsername(url);
      if (!username) {
        return new Response(
          JSON.stringify({ error: 'URL de perfil inválida. Use um link como https://www.instagram.com/username/' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profileData = await scrapeProfile(username);
      return new Response(
        JSON.stringify(profileData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default action: scrape post for image URLs
    const targetUrl = url || '';
    if (!targetUrl.includes('instagram.com/p/') && !targetUrl.includes('instagram.com/reel/')) {
      // Check if it's a profile URL and hint them
      const username = extractUsername(targetUrl);
      if (username) {
        return new Response(
          JSON.stringify({ error: 'Use a ação "profile" para buscar posts de um perfil.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'URL de post do Instagram inválida. Use um link como https://www.instagram.com/p/XXXXX/' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const postData = await scrapePost(targetUrl);

    if (postData.images.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Nenhuma imagem encontrada. O post pode ser privado ou o Instagram bloqueou o acesso.',
          title: postData.title,
          images: [],
          count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ title: postData.title, images: postData.images, count: postData.images.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Instagram scraper error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao processar' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
