import { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Low-quality placeholder or solid color while loading */
  placeholderColor?: string;
  /** Fade in on load */
  fadeIn?: boolean;
}

/**
 * Lazy-loaded image with native IntersectionObserver.
 * Uses loading="lazy" + decoding="async" for best browser-native perf.
 */
export function OptimizedImage({
  src,
  alt = '',
  className,
  placeholderColor = 'transparent',
  fadeIn = true,
  style,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn('overflow-hidden', className)}
      style={{ backgroundColor: placeholderColor, ...style }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'w-full h-full object-cover',
          fadeIn && 'transition-opacity duration-300',
          fadeIn && !loaded && 'opacity-0',
          fadeIn && loaded && 'opacity-100'
        )}
        {...props}
      />
    </div>
  );
}
