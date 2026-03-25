import html2canvas from 'html2canvas';
import type { TweetConfig } from './wizard/StepTweetConfig';

interface TweetRenderData {
  text: string;
  photo?: string | null;
  fontScale?: number;
  paddingScale?: number;
  textAlign?: 'left' | 'center' | 'right';
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
  const horizontalPadding = Math.round(88 * paddingScale);
  const avatarSize = Math.round(74 * paddingScale);
  const headerGap = Math.round(18 * paddingScale);

  // Engagement numbers
  const likes = Math.floor(Math.random() * 4000) + 200;
  const retweets = Math.floor(Math.random() * 800) + 50;
  const replies = Math.floor(Math.random() * 300) + 10;
  const views = Math.floor((likes * 15) + Math.random() * 20000);
  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K` : `${n}`;
  const hours = Math.floor(Math.random() * 23) + 1;

  // Calculate font sizes based on text length for optimal fill
  const textLen = card.text.length;
  let tweetFontSize: number;
  if (textLen < 60) tweetFontSize = 72;
  else if (textLen < 120) tweetFontSize = 60;
  else if (textLen < 200) tweetFontSize = 48;
  else tweetFontSize = 40;
  tweetFontSize = Math.round(tweetFontSize * fontScale);

  // Photo height calculation
  const photoMaxH = hasPhoto ? Math.round(format.h * 0.42) : 0;

  container.innerHTML = `
    <div style="
      width: ${format.w}px;
      height: ${format.h}px;
      background: ${bg};
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      box-sizing: border-box;
      padding: ${Math.round(format.h * 0.08)}px 0 ${Math.round(format.h * 0.06)}px;
    ">
      <!-- Tweet card -->
      <div style="padding: 0 ${horizontalPadding}px; display: flex; flex-direction: column; flex: 1; justify-content: flex-start;">
        <!-- Header: profile -->
        <div style="display: flex; align-items: center; margin-bottom: 30px; gap: ${headerGap}px;">
          ${config.profilePhoto
            ? `<img src="${config.profilePhoto}" style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" crossorigin="anonymous" />`
            : `<div style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: 50%; background: ${isDark ? '#2F3336' : '#CFD9DE'}; flex-shrink: 0;"></div>`
          }
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
              <span style="font-weight: 700; font-size: ${Math.round(30 * fontScale)}px; color: ${textColor}; line-height: 1.2;">
                ${escapeHtml(config.displayName || 'User')}
              </span>
              ${config.isVerified ? `
                <svg viewBox="0 0 22 22" width="${Math.round(28 * fontScale)}" height="${Math.round(28 * fontScale)}" style="flex-shrink: 0;">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.272.587.702 1.086 1.24 1.44.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.26.276 1.897.143.634-.131 1.217-.437 1.687-.883.445-.468.751-1.053.882-1.687.13-.633.083-1.29-.14-1.897.587-.273 1.084-.704 1.438-1.246.355-.54.552-1.17.57-1.817z" fill="${linkColor}"/>
                  <path d="M9.585 14.929l-3.28-3.28 1.168-1.168 2.112 2.112 4.716-4.716 1.168 1.168-5.884 5.884z" fill="white"/>
                </svg>
              ` : ''}
            </div>
            <span style="font-size: ${Math.round(24 * fontScale)}px; color: ${subColor}; line-height: 1.3;">
              @${escapeHtml(config.username || 'user')} · ${hours}h
            </span>
          </div>
          <!-- X logo -->
          <svg viewBox="0 0 24 24" width="${Math.round(34 * fontScale)}" height="${Math.round(34 * fontScale)}" style="flex-shrink: 0; fill: ${subColor};">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>

        <!-- Tweet text -->
        <div style="
          font-size: ${tweetFontSize}px;
          line-height: 1.18;
          color: ${textColor};
          margin-bottom: ${hasPhoto ? 26 : 36}px;
          word-wrap: break-word;
          white-space: pre-wrap;
          font-weight: 400;
          letter-spacing: -0.6px;
          text-align: ${textAlign};
        ">${escapeHtml(card.text)}</div>

        <!-- Photo -->
        ${hasPhoto && card.photo ? `
          <div style="
            border-radius: 22px;
            overflow: hidden;
            margin-bottom: 24px;
            border: 1px solid ${borderColor};
          ">
            <img src="${card.photo}" style="width: 100%; display: block; object-fit: cover; max-height: ${photoMaxH}px;" crossorigin="anonymous" />
          </div>
        ` : ''}

        <!-- Time & Views -->
        <div style="
          font-size: ${Math.round(21 * fontScale)}px;
          color: ${subColor};
          padding-bottom: 18px;
          border-bottom: 1px solid ${borderColor};
          margin-bottom: 18px;
        ">
          ${formatNum(views)} visualizações
        </div>

        <!-- Engagement bar -->
        <div style="
          display: flex;
          justify-content: space-around;
          padding: 10px 0;
          color: ${subColor};
          font-size: ${Math.round(20 * fontScale)}px;
          border-bottom: 1px solid ${borderColor};
          margin-top: auto;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="${Math.round(25 * fontScale)}" height="${Math.round(25 * fontScale)}" fill="none" stroke="${subColor}" stroke-width="1.5">
              <path d="M1.751 10c.06 5.09 4.38 9.21 9.6 9.21 1.83 0 3.54-.5 5.01-1.37l3.6 1.01-1.01-3.6c.87-1.47 1.37-3.18 1.37-5.01C20.35 5.39 16.23 1.06 11.15 1 5.84 1.06 1.69 5.33 1.75 10z"/>
            </svg>
            <span>${formatNum(replies)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="${Math.round(25 * fontScale)}" height="${Math.round(25 * fontScale)}" fill="none" stroke="${subColor}" stroke-width="1.5">
              <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2h6v2h-6c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H10.5V4h6c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
            </svg>
            <span>${formatNum(retweets)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="${Math.round(25 * fontScale)}" height="${Math.round(25 * fontScale)}" fill="none" stroke="${subColor}" stroke-width="1.5">
              <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.56-1.13-1.666-1.84-2.908-1.91z"/>
            </svg>
            <span>${formatNum(likes)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="${Math.round(25 * fontScale)}" height="${Math.round(25 * fontScale)}" fill="none" stroke="${subColor}" stroke-width="1.5">
              <path d="M4 12L20 12M14 18L20 12L14 6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
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

/**
 * Renders all tweet cards and returns base64 image URLs.
 */
export async function renderAllTweetCards(
  config: TweetConfig,
  cards: Array<{ body?: string; bodyTop?: string; title?: string; photo?: string | null; fontScale?: number; paddingScale?: number; textAlign?: 'left' | 'center' | 'right' }>,
  format: { w: number; h: number },
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const total = config.cardCount;
  const results: string[] = [];

  for (let i = 0; i < total; i++) {
    onProgress?.(i, total);
    const cardText = cards[i]?.body || cards[i]?.bodyTop || cards[i]?.title || config.tweetTexts[i] || '';
    const cardPhoto = cards[i]?.photo ?? (config.photoMode !== 'none' ? config.tweetPhotos[i] : null);

    const dataUrl = await renderTweetToImage(config, {
      text: cardText,
      photo: cardPhoto,
      fontScale: cards[i]?.fontScale,
      paddingScale: cards[i]?.paddingScale,
      textAlign: cards[i]?.textAlign,
    }, i, format);
    results.push(dataUrl);

    if (i < total - 1) await new Promise(r => setTimeout(r, 200));
  }

  onProgress?.(total, total);
  return results;
}
