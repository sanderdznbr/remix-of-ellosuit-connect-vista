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
}

const TweetCard2: React.FC<TweetCard2Props> = ({ config, text, photo, width, height, editable = false, onTextChange, onClick, cardRef }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const isDark = config.theme === 'dark';
  const scale = width / 1080;
  const s = useCallback((value: number) => Math.round(value * scale), [scale]);

  const colors = useMemo(() => ({
    bg: isDark ? '#000000' : '#ffffff',
    text: isDark ? '#e7e9ea' : '#0f1419',
    sub: isDark ? '#71767b' : '#536471',
    border: isDark ? '#2f3336' : '#cfd9de',
    photoBg: isDark ? '#16181c' : '#eff3f4',
    brand: '#1d9bf0',
  }), [isDark]);

  const formattedHtml = useMemo(() => {
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return html;
  }, [text]);

  const handleInput = useCallback(() => {
    if (!textRef.current || !onTextChange) return;
    onTextChange(textRef.current.innerText || '');
  }, [onTextChange]);

  const avatarSize = s(76);
  const headerGap = s(16);
  const sidePadding = s(64);
  const photoHeight = photo ? Math.round(height * 0.34) : 0;
  const tweetFontSize = text.length > 220 ? s(42) : text.length > 120 ? s(48) : s(56);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{
        width,
        height,
        background: colors.bg,
        color: colors.text,
        fontFamily: "'TwitterChirp', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: `${s(84)}px ${sidePadding}px ${s(48)}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: s(34) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: headerGap }}>
          {config.profilePhoto ? (
            <img
              src={config.profilePhoto}
              alt=""
              crossOrigin={config.profilePhoto.startsWith('data:') || config.profilePhoto.startsWith('blob:') ? undefined : 'anonymous'}
              referrerPolicy="no-referrer"
              style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', background: colors.photoBg, border: `1px solid ${colors.border}`, flexShrink: 0 }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: s(8), minWidth: 0 }}>
              <span style={{ fontWeight: 800, fontSize: s(34), lineHeight: 1.1, color: colors.text }}>{config.displayName || 'User'}</span>
              {config.isVerified && (
                <svg viewBox="0 0 24 24" width={s(24)} height={s(24)} style={{ flexShrink: 0 }}>
                  <path fill={colors.brand} d="M22.25 12c0 .58-.34 1.11-.52 1.63-.19.55-.25 1.18-.61 1.65-.36.48-.97.73-1.45 1.09-.46.35-.86.82-1.41 1.01-.53.18-1.14.07-1.72.07-.58 0-1.2.11-1.72-.07-.55-.19-.95-.66-1.41-1.01-.48-.36-1.09-.61-1.45-1.09-.36-.47-.42-1.1-.61-1.65C2.09 13.11 1.75 12.58 1.75 12s.34-1.11.52-1.63c.19-.55.25-1.18.61-1.65.36-.48.97-.73 1.45-1.09.46-.35.86-.82 1.41-1.01.53-.18 1.14-.07 1.72-.07.58 0 1.2-.11 1.72.07.55.19.95.66 1.41 1.01.48.36 1.09.61 1.45 1.09.36.47.42 1.1.61 1.65.18.52.52 1.05.52 1.63Z" />
                  <path fill="#fff" d="m10.4 15.4-2.55-2.54 1.14-1.14 1.41 1.41 4.62-4.62 1.14 1.14-5.76 5.75Z" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: s(26), lineHeight: 1.2, color: colors.sub, marginTop: s(4) }}>@{config.username || 'user'}</span>
          </div>
        </div>

        {editable ? (
          <div
            ref={textRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
            style={{ fontSize: tweetFontSize, lineHeight: 1.22, fontWeight: 400, letterSpacing: '-0.03em', color: colors.text, outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: s(120) }}
          />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: formattedHtml }} style={{ fontSize: tweetFontSize, lineHeight: 1.22, fontWeight: 400, letterSpacing: '-0.03em', color: colors.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: s(120) }} />
        )}

        {photo && (
          <div style={{ width: '100%', height: photoHeight, borderRadius: s(22), overflow: 'hidden', border: `1px solid ${colors.border}`, background: colors.photoBg }}>
            <img
              src={photo}
              alt=""
              crossOrigin={photo.startsWith('data:') || photo.startsWith('blob:') ? undefined : 'anonymous'}
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', display: 'block', objectFit: config.photoFit, objectPosition: 'center' }}
            />
          </div>
        )}
      </div>

      {config.showEngagement ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: s(18) }}>
          <div style={{ height: 1, background: colors.border, width: '100%' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: colors.sub, fontSize: s(18) }}>
            <span>💬 {config.engagement.replies || '0'}</span>
            <span>🔁 {config.engagement.retweets || '0'}</span>
            <span>❤️ {config.engagement.likes || '0'}</span>
            <span>🔖 {config.engagement.bookmarks || '0'}</span>
            <span>👁 {config.engagement.views || '0'}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TweetCard2;