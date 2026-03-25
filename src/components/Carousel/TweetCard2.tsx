import React, { useCallback, useMemo, useRef } from 'react';
import type { Tweet2Config } from './wizard/StepTweet2Config';

interface TweetCard2Props {
  config: Tweet2Config;
  text: string;
  photo?: string | null;
  width: number;
  height: number;
  editable?: boolean;
  onTextChange?: (value: string) => void;
  onClick?: () => void;
  cardRef?: React.Ref<HTMLDivElement>;
  fontScale?: number;
  paddingScale?: number;
  gapScale?: number;
}

const TweetCard2: React.FC<TweetCard2Props> = ({ config, text, photo, width, height, editable = false, onTextChange, onClick, cardRef, fontScale, paddingScale, gapScale }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const isDark = config.theme === 'dark';
  const scale = width / 1080;
  const s = useCallback((v: number) => Math.round(v * scale), [scale]);

  const colors = useMemo(() => ({
    bg: isDark ? '#000000' : '#ffffff',
    text: isDark ? '#e7e9ea' : '#0f1419',
    sub: isDark ? '#71767b' : '#536471',
    border: isDark ? '#2f3336' : '#eff3f4',
    photoBg: isDark ? '#16181c' : '#eff3f4',
    brand: '#1d9bf0',
  }), [isDark]);

  const formattedHtml = useMemo(() => {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return html;
  }, [text]);

  const handleInput = useCallback(() => {
    if (!textRef.current || !onTextChange) return;
    onTextChange(textRef.current.innerText || '');
  }, [onTextChange]);

  // Sizing — matches real Twitter proportions at 1080px base
  const ps = paddingScale ?? 1;
  const avatarSize = s(80);
  const sidePad = Math.round(s(56) * ps);
  const topPad = Math.round(s(56) * ps);
  const photoHeight = photo ? Math.round(height * 0.38) : 0;

  // Font size: use fontScale if provided, otherwise auto-size based on text length
  const baseFontSize = text.length > 220 ? s(38) : text.length > 120 ? s(44) : s(50);
  const tweetFontSize = fontScale ? Math.round(baseFontSize * fontScale) : baseFontSize;

  // Profile photo src with fallback
  const profileSrc = config.profilePhoto || undefined;
  const crossOriginAttr = profileSrc && !profileSrc.startsWith('data:') && !profileSrc.startsWith('blob:') ? 'anonymous' as const : undefined;

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      data-tweet2-card
      style={{
        width,
        height,
        background: colors.bg,
        color: colors.text,
        fontFamily: "'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main content area — vertically centered when no photo */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: `${topPad}px ${sidePad}px`,
        gap: Math.round(s(24) * (gapScale ?? 1)),
        overflow: 'hidden',
      }}>
        {/* Header: avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: s(14) }}>
          {/* Avatar */}
          {profileSrc ? (
            <img
              src={profileSrc}
              alt=""
              crossOrigin={crossOriginAttr}
              referrerPolicy="no-referrer"
              onError={(e) => { const el = e.target as HTMLImageElement; if (!el.dataset.retried) { el.dataset.retried = '1'; el.crossOrigin = ''; el.referrerPolicy = 'no-referrer'; el.src = el.src; } }}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: `${s(2)}px solid ${colors.border}`,
              }}
            />
          ) : (
            <div style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: '50%',
              background: colors.photoBg,
              border: `${s(2)}px solid ${colors.border}`,
              flexShrink: 0,
            }} />
          )}

          {/* Name + username column */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1, overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: s(6), flexWrap: 'nowrap' }}>
              <span style={{
                fontWeight: 700,
                fontSize: s(32),
                lineHeight: 1.3,
                color: colors.text,
                overflow: 'visible',
                whiteSpace: 'nowrap',
              }}>
                {config.displayName || 'User'}
              </span>

              {/* Verified badge */}
              {config.isVerified && (
                <svg viewBox="0 0 22 22" width={s(28)} height={s(28)} style={{ flexShrink: 0 }}>
                  <path fill={colors.brand} d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.607-.274 1.264-.144 1.897.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              )}
            </div>
            <span style={{
              fontSize: s(28),
              lineHeight: 1.3,
              color: colors.sub,
              marginTop: s(2),
            }}>
              @{config.username || 'user'}
            </span>
          </div>
        </div>

        {/* Tweet text */}
        {editable ? (
          <div
            ref={textRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
            style={{
              fontSize: tweetFontSize,
              lineHeight: 1.3,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: colors.text,
              outline: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          />
        ) : (
          <div
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
            style={{
              fontSize: tweetFontSize,
              lineHeight: 1.3,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: colors.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          />
        )}

        {/* Photo */}
        {photo && (
          <div style={{
            width: '100%',
            height: photoHeight,
            borderRadius: s(24),
            overflow: 'hidden',
            border: `${s(2)}px solid ${colors.border}`,
            background: colors.photoBg,
            flexShrink: 0,
          }}>
            <img
              src={photo}
              alt=""
              crossOrigin={photo.startsWith('data:') || photo.startsWith('blob:') ? undefined : 'anonymous'}
              referrerPolicy="no-referrer"
              onError={(e) => { const el = e.target as HTMLImageElement; if (!el.dataset.retried) { el.dataset.retried = '1'; el.removeAttribute('crossOrigin'); el.referrerPolicy = 'no-referrer'; const src = el.src; el.src = ''; setTimeout(() => { el.src = src; }, 50); } }}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: config.photoFit || 'cover',
                objectPosition: 'center',
              }}
            />
          </div>
        )}
      </div>

      {/* Engagement bar */}
      {config.showEngagement && (
        <div style={{
          padding: `0 ${sidePad}px ${s(40)}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: s(16),
        }}>
          <div style={{ height: 1, background: colors.border, width: '100%' }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: colors.sub,
            fontSize: s(24),
            fontWeight: 500,
          }}>
            <span>💬 {config.engagement.replies || '0'}</span>
            <span>🔁 {config.engagement.retweets || '0'}</span>
            <span>❤️ {config.engagement.likes || '0'}</span>
            <span>🔖 {config.engagement.bookmarks || '0'}</span>
            <span>👁 {config.engagement.views || '0'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TweetCard2;
