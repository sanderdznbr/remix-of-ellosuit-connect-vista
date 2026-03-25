import React from 'react';
import html2canvas from 'html2canvas';
import type { TweetConfig } from './wizard/StepTweetConfig';

interface TweetRenderData {
  text: string;
  photo?: string | null;
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

  // Scale factor for high-res rendering
  const scale = format.w / 1080;
  const px = (v: number) => `${Math.round(v * scale)}px`;

  const profileSize = 48;
  const hasPhoto = !!card.photo;

  // Generate realistic engagement numbers
  const likes = Math.floor(Math.random() * 4000) + 200;
  const retweets = Math.floor(Math.random() * 800) + 50;
  const replies = Math.floor(Math.random() * 300) + 10;
  const views = Math.floor((likes * 15) + Math.random() * 20000);
  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K` : `${n}`;

  // Time ago
  const hours = Math.floor(Math.random() * 23) + 1;
  const timeLabel = `${hours}h`;

  container.innerHTML = `
    <div style="
      width: ${format.w}px;
      height: ${format.h}px;
      background: ${bg};
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: ${px(60)} ${px(64)};
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
    ">
      <!-- Header: profile -->
      <div style="display: flex; align-items: center; margin-bottom: ${px(16)};">
        ${config.profilePhoto
          ? `<img src="${config.profilePhoto}" style="width: ${px(profileSize)}; height: ${px(profileSize)}; border-radius: 50%; object-fit: cover; margin-right: ${px(12)};" crossorigin="anonymous" />`
          : `<div style="width: ${px(profileSize)}; height: ${px(profileSize)}; border-radius: 50%; background: ${isDark ? '#2F3336' : '#CFD9DE'}; margin-right: ${px(12)};"></div>`
        }
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: ${px(4)};">
            <span style="font-weight: 700; font-size: ${px(15)}; color: ${textColor}; line-height: 1.2;">
              ${config.displayName || 'User'}
            </span>
            ${config.isVerified ? `
              <svg viewBox="0 0 22 22" width="${px(18)}" height="${px(18)}" style="flex-shrink: 0;">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.272.587.702 1.086 1.24 1.44.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.26.276 1.897.143.634-.131 1.217-.437 1.687-.883.445-.468.751-1.053.882-1.687.13-.633.083-1.29-.14-1.897.587-.273 1.084-.704 1.438-1.246.355-.54.552-1.17.57-1.817z" fill="${linkColor}"/>
                <path d="M9.585 14.929l-3.28-3.28 1.168-1.168 2.112 2.112 4.716-4.716 1.168 1.168-5.884 5.884z" fill="white"/>
              </svg>
            ` : ''}
          </div>
          <span style="font-size: ${px(14)}; color: ${subColor}; line-height: 1.2;">
            @${config.username || 'user'} · ${timeLabel}
          </span>
        </div>
        <!-- X logo -->
        <svg viewBox="0 0 24 24" width="${px(22)}" height="${px(22)}" style="flex-shrink: 0; fill: ${subColor};">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>

      <!-- Tweet text -->
      <div style="
        font-size: ${px(config.cardCount === 1 ? 28 : 22)};
        line-height: 1.4;
        color: ${textColor};
        margin-bottom: ${px(hasPhoto ? 16 : 20)};
        word-wrap: break-word;
        white-space: pre-wrap;
        font-weight: 400;
      ">${escapeHtml(card.text)}</div>

      <!-- Photo -->
      ${hasPhoto && card.photo ? `
        <div style="
          border-radius: ${px(16)};
          overflow: hidden;
          margin-bottom: ${px(16)};
          border: 1px solid ${borderColor};
          max-height: ${px(format.h * 0.4)};
        ">
          <img src="${card.photo}" style="width: 100%; display: block; object-fit: cover; max-height: ${px(format.h * 0.4)};" crossorigin="anonymous" />
        </div>
      ` : ''}

      <!-- Time & Views -->
      <div style="
        font-size: ${px(14)};
        color: ${subColor};
        padding-bottom: ${px(12)};
        border-bottom: 1px solid ${borderColor};
        margin-bottom: ${px(12)};
      ">
        ${formatNum(views)} visualizações
      </div>

      <!-- Engagement bar -->
      <div style="
        display: flex;
        justify-content: space-between;
        padding: ${px(4)} ${px(16)};
        color: ${subColor};
        font-size: ${px(13)};
      ">
        <div style="display: flex; align-items: center; gap: ${px(6)};">
          <svg viewBox="0 0 24 24" width="${px(18)}" height="${px(18)}" fill="none" stroke="${subColor}" stroke-width="1.5">
            <path d="M1.751 10c.06 5.09 4.38 9.21 9.6 9.21 1.83 0 3.54-.5 5.01-1.37l3.6 1.01-1.01-3.6c.87-1.47 1.37-3.18 1.37-5.01C20.35 5.39 16.23 1.06 11.15 1 5.84 1.06 1.69 5.33 1.75 10z"/>
          </svg>
          <span>${formatNum(replies)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: ${px(6)};">
          <svg viewBox="0 0 24 24" width="${px(18)}" height="${px(18)}" fill="none" stroke="${subColor}" stroke-width="1.5">
            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2h6v2h-6c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H10.5V4h6c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
          </svg>
          <span>${formatNum(retweets)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: ${px(6)};">
          <svg viewBox="0 0 24 24" width="${px(18)}" height="${px(18)}" fill="none" stroke="${subColor}" stroke-width="1.5">
            <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.56-1.13-1.666-1.84-2.908-1.91z"/>
          </svg>
          <span>${formatNum(likes)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: ${px(6)};">
          <svg viewBox="0 0 24 24" width="${px(18)}" height="${px(18)}" fill="none" stroke="${subColor}" stroke-width="1.5">
            <path d="M4 12L20 12M14 18L20 12L14 6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  `;

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
  cards: Array<{ body?: string; bodyTop?: string; title?: string }>,
  format: { w: number; h: number },
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const total = config.cardCount;
  const results: string[] = [];

  for (let i = 0; i < total; i++) {
    onProgress?.(i, total);
    const cardText = cards[i]?.body || cards[i]?.bodyTop || cards[i]?.title || config.tweetTexts[i] || '';
    const cardPhoto = config.photoMode !== 'none' ? config.tweetPhotos[i] : null;
    
    const dataUrl = await renderTweetToImage(config, { text: cardText, photo: cardPhoto }, i, format);
    results.push(dataUrl);
    
    // Small delay between renders
    if (i < total - 1) await new Promise(r => setTimeout(r, 200));
  }

  onProgress?.(total, total);
  return results;
}
