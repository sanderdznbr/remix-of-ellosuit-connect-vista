import html2canvas from 'html2canvas';
import type { TweetConfig } from './wizard/StepTweetConfig';

interface TweetRenderData {
  text: string;
  photo?: string | null;
  fontScale?: number;
  paddingScale?: number;
  textAlign?: 'left' | 'center' | 'right';
  uniformFontSize?: number;
  cardPhoto?: string | null; // per-card photo override
  photoFit?: 'cover' | 'contain' | 'fill';
}

/**
 * Renders a tweet card as an image using html2canvas.
 * Returns a base64 data URL of the rendered tweet.
 */
export async function renderTweetToImage(
  config: TweetConfig,
  card: TweetRenderData,
  index: number,
  format: { w: number; h: number }
): Promise<string> {
  const isDark = config.theme === 'dark';

  // Create off-screen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${format.w}px`;
  container.style.height = `${format.h}px`;
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const bg = isDark ? '#15202B' : '#FFFFFF';
  const textColor = isDark ? '#E7E9EA' : '#0F1419';
  const subColor = isDark ? '#8B98A5' : '#536471';
  const borderColor = isDark ? '#2F3336' : '#EFF3F4';
  const linkColor = '#1D9BF0';

  const hasPhoto = !!card.photo;
  const fontScale = card.fontScale ?? 1;
  const paddingScale = card.paddingScale ?? 1;
  const textAlign = card.textAlign ?? 'left';
  const horizontalPadding = Math.round(100 * paddingScale);
  const avatarSize = Math.round(80 * paddingScale);
  const headerGap = Math.round(16 * paddingScale);

  // Calculate font sizes — use uniformFontSize (max text length) for consistent sizing across all cards
  const textLen = card.uniformFontSize ?? card.text.length;
  let tweetFontSize: number;
  if (textLen < 50) tweetFontSize = 82;
  else if (textLen < 100) tweetFontSize = 68;
  else if (textLen < 180) tweetFontSize = 56;
  else if (textLen < 280) tweetFontSize = 46;
  else tweetFontSize = 38;
  tweetFontSize = Math.round(tweetFontSize * fontScale);

  const nameFontSize = Math.round(34 * fontScale);
  const usernameFontSize = Math.round(28 * fontScale);
  const verifiedSize = Math.round(30 * fontScale);

  // Photo fit mode
  const photoFit = card.photoFit ?? 'cover';
  const photoObjectFit = photoFit === 'fill' ? 'fill' : photoFit === 'contain' ? 'contain' : 'cover';

  // Photo height: constrain to a reasonable portion, like real Twitter
  const photoMaxH = hasPhoto ? Math.round(format.h * 0.35) : 0;

  container.innerHTML = `
    <div style="
      width: ${format.w}px;
      height: ${format.h}px;
      background: ${bg};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: stretch;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      box-sizing: border-box;
      padding: ${Math.round(format.h * 0.06)}px 0;
    ">
      <div style="padding: 0 ${horizontalPadding}px; display: flex; flex-direction: column; justify-content: center; flex: 1;">
        <!-- Header: profile -->
        <div style="display: flex; align-items: center; margin-bottom: ${Math.round(32 * paddingScale)}px; gap: ${headerGap}px;">
          ${config.profilePhoto
            ? `<img src="${config.profilePhoto}" style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" crossorigin="anonymous" />`
            : `<div style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: 50%; background: ${isDark ? '#2F3336' : '#CFD9DE'}; flex-shrink: 0;"></div>`
          }
          <div style="display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 700; font-size: ${nameFontSize}px; color: ${textColor}; line-height: 1.2;">
                ${escapeHtml(config.displayName || 'User')}
              </span>
              ${config.isVerified ? `
                <svg viewBox="0 0 22 22" width="${verifiedSize}" height="${verifiedSize}" style="flex-shrink: 0; display: block; margin-top: 4px;">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.272.587.702 1.086 1.24 1.44.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.26.276 1.897.143.634-.131 1.217-.437 1.687-.883.445-.468.751-1.053.882-1.687.13-.633.083-1.29-.14-1.897.587-.273 1.084-.704 1.438-1.246.355-.54.552-1.17.57-1.817z" fill="${linkColor}"/>
                  <path d="M9.585 14.929l-3.28-3.28 1.168-1.168 2.112 2.112 4.716-4.716 1.168 1.168-5.884 5.884z" fill="white"/>
                </svg>
              ` : ''}
            </div>
            <span style="font-size: ${usernameFontSize}px; color: ${subColor}; line-height: 1.2; margin-top: 4px;">
              @${escapeHtml(config.username || 'user')}
            </span>
          </div>
        </div>

        <!-- Tweet text -->
        <div style="
          font-size: ${tweetFontSize}px;
          line-height: 1.3;
          color: ${textColor};
          margin-bottom: ${hasPhoto ? Math.round(44 * paddingScale) : 0}px;
          word-wrap: break-word;
          white-space: pre-wrap;
          font-weight: 400;
          letter-spacing: -0.4px;
          text-align: ${textAlign};
        ">${formatTweetText(card.text)}</div>

        <!-- Photo -->
        ${hasPhoto && card.photo ? `
          <div style="
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid ${borderColor};
            max-height: ${photoMaxH}px;
            flex-shrink: 0;
          ">
            <img src="${card.photo}" style="width: 100%; height: ${photoMaxH}px; display: block; object-fit: ${photoObjectFit};" crossorigin="anonymous" />
          </div>
        ` : ''}

        <!-- Engagement bar -->
        ${config.showEngagement ? `
          <div style="
            display: flex;
            align-items: center;
            gap: ${Math.round(48 * paddingScale)}px;
            margin-top: ${Math.round(36 * paddingScale)}px;
            padding-top: ${Math.round(20 * paddingScale)}px;
            border-top: 1px solid ${borderColor};
          ">
            ${config.engagement.replies ? `
              <div style="display: flex; align-items: center; gap: ${Math.round(8 * paddingScale)}px;">
                <svg viewBox="0 0 24 24" width="${Math.round(22 * fontScale)}" height="${Math.round(22 * fontScale)}" fill="none" stroke="${subColor}" stroke-width="1.5">
                  <path d="M1.751 10c.004-.192.0075-.39.015-.586A2.25 2.25 0 0 1 4.01 7.25h15.98a2.25 2.25 0 0 1 2.244 2.164c.019.495.028.998.028 1.586 0 .588-.009 1.09-.028 1.586a2.25 2.25 0 0 1-2.244 2.164H4.01a2.25 2.25 0 0 1-2.244-2.164c-.0075-.196-.011-.394-.015-.586m0 0V18a2.25 2.25 0 0 0 2.25 2.25h16a2.25 2.25 0 0 0 2.25-2.25V10" />
                </svg>
                <span style="font-size: ${Math.round(22 * fontScale)}px; color: ${subColor}; font-weight: 400;">${escapeHtml(config.engagement.replies)}</span>
              </div>
            ` : ''}
            ${config.engagement.retweets ? `
              <div style="display: flex; align-items: center; gap: ${Math.round(8 * paddingScale)}px;">
                <svg viewBox="0 0 24 24" width="${Math.round(22 * fontScale)}" height="${Math.round(22 * fontScale)}" fill="none" stroke="${subColor}" stroke-width="1.5">
                  <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2h6v2h-6c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM19.5 20.12l-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2h-6V4h6c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14z" />
                </svg>
                <span style="font-size: ${Math.round(22 * fontScale)}px; color: ${subColor}; font-weight: 400;">${escapeHtml(config.engagement.retweets)}</span>
              </div>
            ` : ''}
            ${config.engagement.likes ? `
              <div style="display: flex; align-items: center; gap: ${Math.round(8 * paddingScale)}px;">
                <svg viewBox="0 0 24 24" width="${Math.round(22 * fontScale)}" height="${Math.round(22 * fontScale)}" fill="none" stroke="${subColor}" stroke-width="1.5">
                  <path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.45-4.92-.334-6.78C3.89 4.48 5.82 3.5 7.998 3.5c1.468 0 2.827.56 3.999 1.64 1.172-1.08 2.531-1.64 3.999-1.64 2.18 0 4.11.98 5.214 2.91 1.116 1.86 1.026 4.28-.334 6.78z" />
                </svg>
                <span style="font-size: ${Math.round(22 * fontScale)}px; color: ${subColor}; font-weight: 400;">${escapeHtml(config.engagement.likes)}</span>
              </div>
            ` : ''}
            ${config.engagement.views ? `
              <div style="display: flex; align-items: center; gap: ${Math.round(8 * paddingScale)}px;">
                <svg viewBox="0 0 24 24" width="${Math.round(22 * fontScale)}" height="${Math.round(22 * fontScale)}" fill="none" stroke="${subColor}" stroke-width="1.5">
                  <path d="M8.75 21V3m-4.5 3v12a3 3 0 0 0 3 3h9.5a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-9.5a3 3 0 0 0-3 3z" />
                </svg>
                <span style="font-size: ${Math.round(22 * fontScale)}px; color: ${subColor}; font-weight: 400;">${escapeHtml(config.engagement.views)}</span>
              </div>
            ` : ''}
            ${config.engagement.bookmarks ? `
              <div style="display: flex; align-items: center; gap: ${Math.round(8 * paddingScale)}px;">
                <svg viewBox="0 0 24 24" width="${Math.round(22 * fontScale)}" height="${Math.round(22 * fontScale)}" fill="none" stroke="${subColor}" stroke-width="1.5">
                  <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" />
                </svg>
                <span style="font-size: ${Math.round(22 * fontScale)}px; color: ${subColor}; font-weight: 400;">${escapeHtml(config.engagement.bookmarks)}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Wait for images to load
  const imgs = container.querySelectorAll('img');
  if (imgs.length > 0) {
    await Promise.all(Array.from(imgs).map(img =>
      img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
    ));
  }

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      width: format.w,
      height: format.h,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bg,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    document.body.removeChild(container);
    return dataUrl;
  } catch (err) {
    console.error('[TweetCanvas] Render error:', err);
    document.body.removeChild(container);
    throw err;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

/** Escapes HTML then converts **bold** markers to <strong> tags */
function formatTweetText(text: string): string {
  let html = escapeHtml(text);
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700">$1</strong>');
  return html;
}

/**
 * Renders all tweet cards and returns base64 image URLs.
 */
export async function renderAllTweetCards(
  config: TweetConfig,
  cards: Array<{ body?: string; bodyTop?: string; title?: string; photo?: string | null; fontScale?: number; paddingScale?: number; textAlign?: 'left' | 'center' | 'right'; uniformFontSize?: number }>,
  format: { w: number; h: number },
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const total = config.cardCount;
  const results: string[] = [];

  // Determine which cards get photos:
  // Cards with explicit photos from the caller always get them.
  // For remaining slots, pick ~60% randomly.
  const photoSlots = new Set<number>();
  if (config.photoMode !== 'none') {
    // First, include cards that have explicit photos
    for (let i = 0; i < total; i++) {
      if (cards[i]?.photo || config.tweetPhotos[i]) {
        photoSlots.add(i);
      }
    }
    // Then fill remaining to ~60%
    const targetPhotoCount = Math.max(1, Math.round(total * 0.6));
    if (photoSlots.size < targetPhotoCount) {
      const candidates = Array.from({ length: total }, (_, i) => i).filter(i => !photoSlots.has(i));
      for (let j = candidates.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [candidates[j], candidates[k]] = [candidates[k], candidates[j]];
      }
      candidates.slice(0, targetPhotoCount - photoSlots.size).forEach(idx => photoSlots.add(idx));
    }
  }

  for (let i = 0; i < total; i++) {
    onProgress?.(i, total);
    const cardText = cards[i]?.body || cards[i]?.bodyTop || cards[i]?.title || config.tweetTexts[i] || '';
    const hasExplicitPhoto = !!(cards[i]?.photo || config.tweetPhotos[i]);
    const shouldHavePhoto = hasExplicitPhoto || photoSlots.has(i);
    const cardPhoto = shouldHavePhoto ? (cards[i]?.photo ?? (config.photoMode !== 'none' ? config.tweetPhotos[i] : null)) : null;

    const dataUrl = await renderTweetToImage(config, {
      text: cardText,
      photo: cardPhoto,
      fontScale: cards[i]?.fontScale,
      paddingScale: cards[i]?.paddingScale,
      textAlign: cards[i]?.textAlign,
      uniformFontSize: cards[i]?.uniformFontSize,
    }, i, format);
    results.push(dataUrl);

    if (i < total - 1) await new Promise(r => setTimeout(r, 200));
  }

  onProgress?.(total, total);
  return results;
}
