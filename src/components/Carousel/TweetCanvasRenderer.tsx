import React from 'react';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import type { TweetConfig } from './wizard/StepTweetConfig';
import TweetCard from './TweetCard';

/**
 * Captures a visible DOM element (TweetCard) as a data URL image.
 */
export async function captureTweetCardElement(
  element: HTMLElement,
  format: { w: number; h: number }
): Promise<string> {
  const canvas = await html2canvas(element, {
    width: format.w,
    height: format.h,
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

interface TweetRenderData {
  text: string;
  photo?: string | null;
  photoStyle?: string | null;
  fontScale?: number;
  paddingScale?: number;
  textAlign?: 'left' | 'center' | 'right';
  uniformFontSize?: number;
  cardPhoto?: string | null; // per-card photo override
  photoFit?: 'cover' | 'contain' | 'fill';
  photoHeight?: number;
  fontSizeOverride?: number;
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
  if ('fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font readiness failures and proceed with fallback fonts
    }
  }

  const mountHost = document.createElement('div');
  mountHost.style.position = 'fixed';
  mountHost.style.left = '-9999px';
  mountHost.style.top = '0';
  mountHost.style.width = `${format.w}px`;
  mountHost.style.height = `${format.h}px`;
  mountHost.style.zIndex = '-1';
  document.body.appendChild(mountHost);

  const root = createRoot(mountHost);
  const textLen = card.uniformFontSize ?? card.text.length;
  const hasPhoto = !!card.photo;
  let computedFontSize: number;
  if (hasPhoto) {
    if (textLen < 50) computedFontSize = 72;
    else if (textLen < 100) computedFontSize = 58;
    else if (textLen < 180) computedFontSize = 48;
    else if (textLen < 280) computedFontSize = 40;
    else computedFontSize = 34;
  } else {
    if (textLen < 50) computedFontSize = 82;
    else if (textLen < 100) computedFontSize = 68;
    else if (textLen < 180) computedFontSize = 56;
    else if (textLen < 280) computedFontSize = 46;
    else computedFontSize = 38;
  }

  const fontSizeOverride = card.fontSizeOverride ?? Math.round(computedFontSize * (card.fontScale ?? 1));
  const bg = config.theme === 'dark' ? '#000000' : '#FFFFFF';

  root.render(
    React.createElement(TweetCard, {
      config,
      text: card.text,
      photo: card.photo,
      photoFit: card.photoFit ?? 'cover',
      width: format.w,
      height: format.h,
      photoHeight: card.photoHeight,
      fontSizeOverride,
      headerOffsetY: 0,
    })
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const imgs = mountHost.querySelectorAll('img');
  if (imgs.length > 0) {
    await Promise.all(Array.from(imgs).map(async (img) => {
      if (!img.complete) {
        await new Promise((r) => { img.onload = () => r(null); img.onerror = () => r(null); });
      }

      if (typeof img.decode === 'function') {
        try {
          await img.decode();
        } catch {
          // ignore decode failures and let html2canvas attempt capture
        }
      }
    }));
  }

  try {
    const captureTarget = mountHost.firstElementChild as HTMLElement;
    const canvas = await html2canvas(captureTarget, {
      width: format.w,
      height: format.h,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bg,
      logging: false,
      imageTimeout: 30000,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('img').forEach((img) => {
          img.crossOrigin = 'anonymous';
          img.referrerPolicy = 'no-referrer';
          img.loading = 'eager';
        });
      },
    });

    const dataUrl = canvas.toDataURL('image/png');
    root.unmount();
    document.body.removeChild(mountHost);
    return dataUrl;
  } catch (err) {
    console.error('[TweetCanvas] Render error:', err);
    root.unmount();
    document.body.removeChild(mountHost);
    throw err;
  }
}

/**
 * Renders all tweet cards and returns base64 image URLs.
 */
export async function renderAllTweetCards(
  config: TweetConfig,
  cards: Array<{ body?: string; bodyTop?: string; title?: string; photo?: string | null; fontScale?: number; paddingScale?: number; textAlign?: 'left' | 'center' | 'right'; uniformFontSize?: number; photoFit?: 'cover' | 'contain' | 'fill'; photoHeight?: number; fontSizeOverride?: number }>,
  format: { w: number; h: number },
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const total = config.cardCount;
  const results: string[] = [];

  for (let i = 0; i < total; i++) {
    onProgress?.(i, total);
    const cardText = cards[i]?.body || cards[i]?.bodyTop || cards[i]?.title || config.tweetTexts[i] || '';
    const cardPhoto = cards[i]?.photo ?? (config.photoMode !== 'none' ? config.tweetPhotos[i] : null) ?? null;
    const photoFit = cards[i]?.photoFit ?? 'cover';
    const photoStyle = cardPhoto
      ? photoFit === 'contain'
        ? 'contain'
        : photoFit === 'fill'
          ? '100% 100%'
          : 'cover'
      : null;

    const dataUrl = await renderTweetToImage(config, {
      text: cardText,
      photo: cardPhoto,
      photoStyle,
      fontScale: cards[i]?.fontScale,
      paddingScale: cards[i]?.paddingScale,
      textAlign: cards[i]?.textAlign,
      uniformFontSize: cards[i]?.uniformFontSize,
      photoFit: cards[i]?.photoFit,
      photoHeight: cards[i]?.photoHeight,
      fontSizeOverride: cards[i]?.fontSizeOverride,
    }, i, format);
    results.push(dataUrl);

    if (i < total - 1) await new Promise(r => setTimeout(r, 200));
  }

  onProgress?.(total, total);
  return results;
}
