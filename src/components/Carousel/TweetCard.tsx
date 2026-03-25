import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { TweetConfig, TweetPhotoFit } from './wizard/StepTweetConfig';

export interface TweetCardProps {
  config: TweetConfig;
  text: string;
  photo?: string | null;
  photoFit?: TweetPhotoFit;
  width: number;
  height: number;
  editable?: boolean;
  onTextChange?: (newText: string) => void;
  onClick?: () => void;
  cardRef?: React.Ref<HTMLDivElement>;
  photoHeight?: number;
  onPhotoHeightChange?: (h: number) => void;
  /** Override font size (unscaled, base 1080px). When set, ignores text-length auto-sizing */
  fontSizeOverride?: number;
}

/** Live DOM tweet card — pixel-perfect X/Twitter layout, optionally editable */
const TweetCard: React.FC<TweetCardProps> = ({
  config,
  text,
  photo,
  photoFit = 'cover',
  width,
  height,
  editable = false,
  onTextChange,
  onClick,
  cardRef,
  photoHeight: photoHeightProp,
  onPhotoHeightChange,
  fontSizeOverride,
}) => {
  const isDark = config.theme === 'dark';
  const bg = isDark ? '#000000' : '#FFFFFF';
  const textColor = isDark ? '#E7E9EA' : '#0F1419';
  const subColor = isDark ? '#8B98A5' : '#536471';
  const borderColor = isDark ? '#2F3336' : '#EFF3F4';
  const linkColor = '#1D9BF0';

  const hasPhoto = !!(photo);

  // Scale factor relative to 1080px base
  const scale = width / 1080;
  const s = (v: number) => Math.round(v * scale);

  // Font sizing: use override if provided, otherwise auto-size based on text length
  const textLen = text.length;
  let autoFontSize: number;
  if (hasPhoto) {
    if (textLen < 50) autoFontSize = 72;
    else if (textLen < 100) autoFontSize = 58;
    else if (textLen < 180) autoFontSize = 48;
    else if (textLen < 280) autoFontSize = 40;
    else autoFontSize = 34;
  } else {
    if (textLen < 50) autoFontSize = 82;
    else if (textLen < 100) autoFontSize = 68;
    else if (textLen < 180) autoFontSize = 56;
    else if (textLen < 280) autoFontSize = 46;
    else autoFontSize = 38;
  }
  const tweetFontSize = fontSizeOverride ?? autoFontSize;

  const nameFontSize = s(42);
  const usernameFontSize = s(34);
  const verifiedSize = s(28);
  const avatarSize = s(80);
  const headerGap = s(16);
  const horizontalPadding = s(80);
  const defaultPhotoH = hasPhoto ? Math.round(height * 0.35) : 0;
  const photoMaxH = photoHeightProp ?? defaultPhotoH;

  const textRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  const handleInput = useCallback(() => {
    if (isComposing.current) return;
    if (textRef.current && onTextChange) {
      const raw = textRef.current.innerText || '';
      onTextChange(raw);
    }
  }, [onTextChange]);

  // Sync text content when prop changes externally
  useEffect(() => {
    if (textRef.current && !editable) {
      textRef.current.innerText = text;
    }
  }, [text, editable]);

  const formatText = (t: string) => {
    let html = t
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700">$1</strong>');
    return html;
  };

  const objectFitMap: Record<TweetPhotoFit, React.CSSProperties['objectFit']> = {
    cover: 'cover',
    contain: 'contain',
    fill: 'fill',
  };

  const eng = config.engagement;
  const engagementItems = [
    eng.replies && { icon: 'reply', value: eng.replies },
    eng.retweets && { icon: 'retweet', value: eng.retweets },
    eng.likes && { icon: 'like', value: eng.likes },
    eng.views && { icon: 'view', value: eng.views },
    eng.bookmarks && { icon: 'bookmark', value: eng.bookmarks },
  ].filter(Boolean) as { icon: string; value: string }[];

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{
        width,
        height,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'stretch',
        fontFamily: "'TwitterChirp', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: `${Math.round(height * 0.06)}px 0`,
        cursor: editable ? 'text' : onClick ? 'pointer' : undefined,
        position: 'relative',
      }}
    >
      <div style={{ padding: `0 ${horizontalPadding}px` }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: s(32), gap: headerGap }}>
          {config.profilePhoto ? (
            <img
              src={config.profilePhoto}
              crossOrigin={config.profilePhoto.startsWith('data:') || config.profilePhoto.startsWith('blob:') ? undefined : 'anonymous'}
              style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              alt=""
            />
          ) : (
            <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', background: isDark ? '#2F3336' : '#CFD9DE', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, height: avatarSize }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: s(5), minWidth: 0 }}>
              <span style={{ fontWeight: 700, fontSize: nameFontSize, color: textColor, lineHeight: 1.1 }}>
                {config.displayName || 'User'}
              </span>
              {config.isVerified && (
                <svg viewBox="0 0 22 22" width={verifiedSize} height={verifiedSize} style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.272.587.702 1.086 1.24 1.44.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.26.276 1.897.143.634-.131 1.217-.437 1.687-.883.445-.468.751-1.053.882-1.687.13-.633.083-1.29-.14-1.897.587-.273 1.084-.704 1.438-1.246.355-.54.552-1.17.57-1.817z" fill={linkColor} />
                  <path d="M9.585 14.929l-3.28-3.28 1.168-1.168 2.112 2.112 4.716-4.716 1.168 1.168-5.884 5.884z" fill="white" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: usernameFontSize, color: subColor, lineHeight: 1, marginTop: s(2) }}>
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
            onCompositionStart={() => { isComposing.current = true; }}
            onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
            style={{
              fontSize: s(tweetFontSize),
              lineHeight: 1.3,
              color: textColor,
              marginBottom: hasPhoto ? s(48) : 0,
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              fontWeight: 400,
              letterSpacing: '-0.4px',
              textAlign: 'left',
              outline: 'none',
              minHeight: s(40),
              cursor: 'text',
            }}
            dangerouslySetInnerHTML={{ __html: formatText(text) }}
          />
        ) : (
          <div
            style={{
              fontSize: s(tweetFontSize),
              lineHeight: 1.3,
              color: textColor,
              marginBottom: hasPhoto ? s(48) : 0,
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              fontWeight: 400,
              letterSpacing: '-0.4px',
              textAlign: 'left',
            }}
            dangerouslySetInnerHTML={{ __html: formatText(text) }}
          />
        )}

        {/* Photo */}
        {hasPhoto && (
          <PhotoResizable
            photoMaxH={photoMaxH}
            borderRadius={s(16)}
            borderColor={borderColor}
            isDark={isDark}
            photo={photo!}
            photoFit={photoFit}
            objectFit={objectFitMap[photoFit] || 'cover'}
            editable={editable}
            minH={Math.round(height * 0.15)}
            maxH={Math.round(height * 0.65)}
            onHeightChange={onPhotoHeightChange}
          />
        )}

        {/* Engagement */}
        {config.showEngagement && engagementItems.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: s(40),
            marginTop: s(28),
            paddingTop: s(16),
            borderTop: `1px solid ${borderColor}`,
          }}>
            {engagementItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: s(6) }}>
                <EngagementIcon type={item.icon} size={s(18)} color={subColor} />
                <span style={{ fontSize: s(18), color: subColor, fontWeight: 400 }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** Resizable photo container with drag handles */
const PhotoResizable: React.FC<{
  photoMaxH: number;
  borderRadius: number;
  borderColor: string;
  isDark: boolean;
  photo: string;
  photoFit: TweetPhotoFit;
  objectFit: React.CSSProperties['objectFit'];
  editable?: boolean;
  minH: number;
  maxH: number;
  onHeightChange?: (h: number) => void;
}> = ({ photoMaxH, borderRadius, borderColor, isDark, photo, objectFit, editable, minH, maxH, onHeightChange }) => {
  const [localH, setLocalH] = useState(photoMaxH);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  useEffect(() => { setLocalH(photoMaxH); }, [photoMaxH]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = localH;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [editable, localH]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    const newH = Math.max(minH, Math.min(maxH, startH.current + delta));
    setLocalH(newH);
  }, [minH, maxH]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    onHeightChange?.(localH);
  }, [localH, onHeightChange]);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        borderRadius,
        overflow: 'hidden',
        border: `1px solid ${borderColor}`,
        height: localH,
        background: isDark ? '#000' : '#F7F9F9',
        position: 'relative',
      }}>
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit,
            objectPosition: 'center center',
            background: isDark ? '#000' : '#F7F9F9',
          }}
        />
      </div>
      {editable && (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 48,
            height: 12,
            borderRadius: 6,
            background: 'rgba(29,155,240,0.7)',
            cursor: 'ns-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div style={{ width: 20, height: 2, borderRadius: 1, background: 'white' }} />
        </div>
      )}
    </div>
  );
};

const EngagementIcon: React.FC<{ type: string; size: number; color: string }> = ({ type, size, color }) => {
  const props = { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: color, strokeWidth: 1.5 };
  switch (type) {
    case 'reply':
      return <svg {...props}><path d="M1.751 10c.004-.192.0075-.39.015-.586A2.25 2.25 0 0 1 4.01 7.25h15.98a2.25 2.25 0 0 1 2.244 2.164c.019.495.028.998.028 1.586 0 .588-.009 1.09-.028 1.586a2.25 2.25 0 0 1-2.244 2.164H4.01a2.25 2.25 0 0 1-2.244-2.164c-.0075-.196-.011-.394-.015-.586m0 0V18a2.25 2.25 0 0 0 2.25 2.25h16a2.25 2.25 0 0 0 2.25-2.25V10" /></svg>;
    case 'retweet':
      return <svg {...props}><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2h6v2h-6c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM19.5 20.12l-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2h-6V4h6c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14z" /></svg>;
    case 'like':
      return <svg {...props}><path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.45-4.92-.334-6.78C3.89 4.48 5.82 3.5 7.998 3.5c1.468 0 2.827.56 3.999 1.64 1.172-1.08 2.531-1.64 3.999-1.64 2.18 0 4.11.98 5.214 2.91 1.116 1.86 1.026 4.28-.334 6.78z" /></svg>;
    case 'view':
      return <svg {...props}><path d="M8.75 21V3m-4.5 3v12a3 3 0 0 0 3 3h9.5a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-9.5a3 3 0 0 0-3 3z" /></svg>;
    case 'bookmark':
      return <svg {...props}><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" /></svg>;
    default:
      return null;
  }
};

export default TweetCard;