import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Download, Play, RotateCcw, Home, Sparkles } from 'lucide-react';
import WebMWriter from 'webm-writer';
import { ArrayBufferTarget, Muxer } from 'webm-muxer';
import {
  captureAnimatedNodeFrame,
  createVideoSaveTarget,
  getEmbeddedFontCss,
  type SaveFileHandleLike,
  triggerBlobDownload,
  writeBlobToVideoFile,
} from './animatedFrameCapture';
import { supabase } from '@/integrations/supabase/client';

interface AnimatedCard {
  html: string;
  cardIndex: number;
  dimensions: { w: number; h: number };
}

interface Props {
  cards: AnimatedCard[];
  onRecordComplete?: (cardIndex: number, blob: Blob) => void;
  onRegenerateCard?: (cardIndex: number) => Promise<void> | void;
  regeneratingCardIndex?: number | null;
  onGoHome?: () => void;
}

interface RecordingSurface {
  targetNode: HTMLElement;
  cleanup: () => void;
}

interface ControlledAnimationTimeline {
  setTime: (timeMs: number) => Promise<void>;
}

interface EmbeddedAssetMap {
  [originalUrl: string]: string;
}

interface SupportedWebCodecsEncoder {
  encoderConfig: Omit<VideoEncoderConfig, 'width' | 'height' | 'framerate'>;
  muxerCodec: 'V_VP8' | 'V_VP9' | 'V_AV1';
}

const RECORD_DURATION = 5000;
const FPS_OPTIONS = [25, 30, 60] as const;
type FpsOption = typeof FPS_OPTIONS[number];
const CAPTURE_SCALE = 1;
const CAPTURE_ROOT_CLASS = 'animated-card-capture-root';

const WEB_CODECS_CANDIDATES: SupportedWebCodecsEncoder[] = [
  {
    encoderConfig: {
      codec: 'vp8',
      bitrate: 8_000_000,
      latencyMode: 'realtime',
    },
    muxerCodec: 'V_VP8',
  },
  {
    encoderConfig: {
      codec: 'vp09.00.10.08',
      bitrate: 10_000_000,
      latencyMode: 'realtime',
    },
    muxerCodec: 'V_VP9',
  },
];

const AnimatedCardRenderer: React.FC<Props> = ({
  cards,
  onRecordComplete,
  onRegenerateCard,
  regeneratingCardIndex = null,
  onGoHome,
}) => {
  const [activeCard, setActiveCard] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedVideos, setRecordedVideos] = useState<Record<number, string>>({});
  const [recordingAll, setRecordingAll] = useState(false);
  const [previewNonce, setPreviewNonce] = useState<Record<number, number>>({});
  const [selectedFps, setSelectedFps] = useState<FpsOption>(30);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentCard = cards[activeCard];

  useEffect(() => {
    return () => {
      Object.values(recordedVideos).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [recordedVideos]);

  useEffect(() => {
    if (activeCard > cards.length - 1) setActiveCard(0);
  }, [activeCard, cards.length]);

  const previewKey = useMemo(() => `${activeCard}-${previewNonce[activeCard] ?? 0}`, [activeCard, previewNonce]);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const convertImageToDataUrl = useCallback(async (url: string): Promise<string> => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    const loaded = await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });

    void loaded;

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }, []);

  const resolveImageAsDataUrl = useCallback(async (url: string): Promise<string> => {
    if (!url || url.startsWith('data:')) return url;

    try {
      return await convertImageToDataUrl(url);
    } catch {
      try {
        const { data, error } = await supabase.functions.invoke('image-proxy', {
          body: { url },
        });
        if (error) throw error;
        return data?.dataUrl || url;
      } catch {
        return url;
      }
    }
  }, [convertImageToDataUrl]);

  const buildEmbeddableHtml = useCallback(async (html: string) => {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');
    const images = Array.from(parsed.querySelectorAll('img'));
    const assetMap: EmbeddedAssetMap = {};

    await Promise.all(images.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:') || assetMap[src]) return;
      assetMap[src] = await resolveImageAsDataUrl(src);
    }));

    images.forEach((img) => {
      const src = img.getAttribute('src');
      if (!src) return;
      const embedded = assetMap[src];
      if (embedded) img.setAttribute('src', embedded);
    });

    return {
      html: `<!DOCTYPE html>\n${parsed.documentElement.outerHTML}`,
      assetMap,
    };
  }, [resolveImageAsDataUrl]);

  const restartCssAnimations = useCallback((root: ParentNode) => {
    const elements = Array.from(root.querySelectorAll<HTMLElement>('*'));
    elements.forEach((element) => {
      const computed = window.getComputedStyle(element);
      const animationName = computed.animationName;
      if (!animationName || animationName === 'none') return;

      const inlineAnimation = element.style.animation;
      element.style.animation = 'none';
      void element.offsetWidth;
      element.style.animation = inlineAnimation || '';
    });
  }, []);

  const restartPreview = useCallback((cardIndex: number) => {
    setPreviewNonce((prev) => ({ ...prev, [cardIndex]: (prev[cardIndex] ?? 0) + 1 }));
  }, []);

  const waitForAnimationPaint = useCallback(async (root: HTMLElement, frames = 1) => {
    const ownerWindow = root.ownerDocument.defaultView ?? window;

    for (let frame = 0; frame < frames; frame += 1) {
      await new Promise<void>((resolve) => {
        ownerWindow.requestAnimationFrame(() => resolve());
      });
    }
  }, []);

  const createControlledAnimationTimeline = useCallback(async (root: HTMLElement): Promise<ControlledAnimationTimeline> => {
    await waitForAnimationPaint(root, 2);

    const animations = typeof root.getAnimations === 'function'
      ? root.getAnimations({ subtree: true })
      : [];

    await Promise.allSettled(
      animations.map(async (animation) => {
        try {
          await animation.ready;
        } catch {
          // noop
        }
      }),
    );

    const setTime = async (timeMs: number) => {
      animations.forEach((animation) => {
        try {
          animation.pause();
        } catch {
          // noop
        }

        try {
          animation.currentTime = timeMs;
        } catch {
          // noop
        }
      });

      void root.offsetHeight;
      await waitForAnimationPaint(root);
    };

    await setTime(0);

    return { setTime };
  }, [waitForAnimationPaint]);

  const normalizeCardCssForCapture = useCallback((cssText: string) => {
    return cssText
      .replace(/\bhtml\s*,\s*body\b/g, `.${CAPTURE_ROOT_CLASS}`)
      .replace(/\bbody\s*,\s*html\b/g, `.${CAPTURE_ROOT_CLASS}`)
      .replace(/(^|}|,)\s*body(?=\s*[{,:.#>])/g, `$1 .${CAPTURE_ROOT_CLASS}`)
      .replace(/(^|}|,)\s*html(?=\s*[{,:.#>])/g, `$1 .${CAPTURE_ROOT_CLASS}`)
      .replace(/:root/g, `.${CAPTURE_ROOT_CLASS}`);
  }, []);

  /**
   * Creates a recording container by injecting the card HTML into a hidden
   * <div> in the main document instead of an iframe. This allows html-to-image
   * to fully access all DOM nodes, fonts, and styles for accurate capture.
   *
   * The card HTML (a full <!DOCTYPE html> document) is parsed: <style> and
   * <link> tags from <head> are injected, and the <body> innerHTML is placed
   * inside the container. CSS animations run normally in the main document.
   */
  const createRecordingContainer = useCallback(async (card: AnimatedCard) => {
    const { w, h } = card.dimensions;
    const { html } = await buildEmbeddableHtml(card.html);

    const container = document.createElement('div');
    container.style.cssText = `position:fixed;left:-${w + 96}px;top:0;width:${w}px;height:${h}px;pointer-events:none;overflow:hidden;z-index:-9999;`;
    document.body.appendChild(container);

    // Parse the card HTML to extract styles and body content
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');

    // Create the render root inside the container
    const renderRoot = document.createElement('div');
    renderRoot.className = CAPTURE_ROOT_CLASS;
    renderRoot.setAttribute('data-animated-capture-root', 'true');
    renderRoot.style.cssText = `width:${w}px;height:${h}px;overflow:hidden;position:relative;display:block;isolation:isolate;margin:0;padding:0;`;
    container.appendChild(renderRoot);

    // Inject <link> tags (Google Fonts, etc.) into the main document <head>
    const injectedLinks: HTMLElement[] = [];
    parsed.querySelectorAll('head link[rel="stylesheet"]').forEach((link) => {
      const clone = document.createElement('link');
      clone.rel = 'stylesheet';
      clone.href = (link as HTMLLinkElement).href;
      clone.crossOrigin = 'anonymous';
      document.head.appendChild(clone);
      injectedLinks.push(clone);
    });

    // Inject <style> tags from the parsed HTML into the render root
    parsed.querySelectorAll('style').forEach((style) => {
      const clone = document.createElement('style');
      clone.textContent = normalizeCardCssForCapture(style.textContent || '');
      renderRoot.appendChild(clone);
    });

    const baseStyle = document.createElement('style');
    baseStyle.textContent = `
      .${CAPTURE_ROOT_CLASS} {
        width: ${w}px;
        height: ${h}px;
        min-width: ${w}px;
        min-height: ${h}px;
        max-width: ${w}px;
        max-height: ${h}px;
        overflow: hidden;
        position: relative;
        display: block;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        line-height: 1;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }

      .${CAPTURE_ROOT_CLASS} *,
      .${CAPTURE_ROOT_CLASS} *::before,
      .${CAPTURE_ROOT_CLASS} *::after {
        box-sizing: border-box;
      }
    `;
    renderRoot.appendChild(baseStyle);

    // Copy body attributes (inline style, class, etc.)
    const parsedBody = parsed.body;
    if (parsedBody) {
      renderRoot.className = [CAPTURE_ROOT_CLASS, parsedBody.className].filter(Boolean).join(' ');

      // Copy background and font styles from body
      const bodyStyle = parsedBody.getAttribute('style');
      if (bodyStyle) {
        renderRoot.style.cssText += `;${bodyStyle}`;
      }
      // Ensure dimensions are fixed
      renderRoot.style.width = `${w}px`;
      renderRoot.style.height = `${h}px`;
      renderRoot.style.overflow = 'hidden';
      renderRoot.style.position = 'relative';
      renderRoot.style.display = 'block';
      renderRoot.style.isolation = 'isolate';
      renderRoot.style.margin = '0';
      renderRoot.style.padding = '0';

      // Copy body innerHTML
      renderRoot.insertAdjacentHTML('beforeend', parsedBody.innerHTML);
    }

    // Wait for fonts to load
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // noop
      }
    }

    // Wait for images to load
    const images = Array.from(renderRoot.querySelectorAll('img'));
    await Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }));

    await Promise.all(images.map(async (img) => {
      if (typeof img.decode !== 'function') return;
      try {
        await img.decode();
      } catch {
        // noop
      }
    }));

    restartCssAnimations(renderRoot);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const cleanup = () => {
      injectedLinks.forEach((link) => {
        if (link.parentNode) link.parentNode.removeChild(link);
      });
      if (container.parentNode) container.parentNode.removeChild(container);
    };

    return { renderRoot, cleanup };
  }, [buildEmbeddableHtml, restartCssAnimations]);

  const createRecordingIframe = useCallback(async (card: AnimatedCard): Promise<RecordingSurface> => {
    const { w, h } = card.dimensions;
    const { html } = await buildEmbeddableHtml(card.html);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;height:${h}px;border:0;pointer-events:none;opacity:0;z-index:-9999;background:transparent;`;
    document.body.appendChild(iframe);

    const cleanup = () => {
      iframe.srcdoc = '<!doctype html><html><body></body></html>';
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error('Tempo esgotado ao preparar o iframe de gravação'));
      }, 8000);

      const handleLoad = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };

      iframe.addEventListener('load', handleLoad, { once: true });
      iframe.srcdoc = html;
    });

    const frameDoc = iframe.contentDocument;
    if (!frameDoc?.body) {
      cleanup();
      throw new Error('Falha ao acessar o conteúdo renderizado do card');
    }

    if (frameDoc.fonts?.ready) {
      try {
        await frameDoc.fonts.ready;
      } catch {
        // noop
      }
    }

    const images = Array.from(frameDoc.querySelectorAll('img'));
    await Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }));

    await Promise.all(images.map(async (img) => {
      if (typeof img.decode !== 'function') return;
      try {
        await img.decode();
      } catch {
        // noop
      }
    }));

    const targetNode = frameDoc.body as HTMLBodyElement;
    targetNode.style.width = `${w}px`;
    targetNode.style.height = `${h}px`;
    targetNode.style.margin = '0';
    targetNode.style.overflow = 'hidden';

    restartCssAnimations(frameDoc);

    return { targetNode, cleanup };
  }, [buildEmbeddableHtml, restartCssAnimations]);

  const updateRecordedUrl = useCallback((cardIndex: number, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setRecordedVideos((prev) => {
      if (prev[cardIndex]) URL.revokeObjectURL(prev[cardIndex]);
      return { ...prev, [cardIndex]: url };
    });
  }, []);

  const getSupportedWebCodecsEncoder = useCallback(async (
    width: number,
    height: number,
    fps: number,
  ): Promise<SupportedWebCodecsEncoder | null> => {
    const webCodecsApi = globalThis as typeof globalThis & {
      VideoEncoder?: typeof VideoEncoder;
      VideoFrame?: typeof VideoFrame;
    };

    if (!webCodecsApi.VideoEncoder?.isConfigSupported || !webCodecsApi.VideoFrame) {
      return null;
    }

    for (const candidate of WEB_CODECS_CANDIDATES) {
      try {
        const config: VideoEncoderConfig = {
          ...candidate.encoderConfig,
          width,
          height,
          framerate: fps,
        };
        const support = await webCodecsApi.VideoEncoder.isConfigSupported(config);
        if (support.supported) {
          return {
            encoderConfig: config,
            muxerCodec: candidate.muxerCodec,
          };
        }
      } catch {
        // noop
      }
    }

    return null;
  }, []);

  const encodeWithWebCodecs = useCallback(async (options: {
    width: number;
    height: number;
    fps: number;
    canvas: HTMLCanvasElement;
    totalFrames: number;
    renderFrame: (frameIndex: number) => Promise<void>;
  }): Promise<Blob | null> => {
    const webCodecsApi = globalThis as typeof globalThis & {
      VideoEncoder?: typeof VideoEncoder;
      VideoFrame?: typeof VideoFrame;
    };

    const supportedEncoder = await getSupportedWebCodecsEncoder(options.width, options.height, options.fps);
    if (!supportedEncoder || !webCodecsApi.VideoEncoder || !webCodecsApi.VideoFrame) {
      return null;
    }

    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: {
        codec: supportedEncoder.muxerCodec,
        width: options.width,
        height: options.height,
        frameRate: options.fps,
      },
      firstTimestampBehavior: 'offset',
    });

    let encodeError: Error | null = null;

    const encoder = new webCodecsApi.VideoEncoder({
      output: (chunk, meta) => {
        try {
          muxer.addVideoChunk(chunk as never, meta as never);
        } catch (error) {
          encodeError = error instanceof Error ? error : new Error('Falha ao muxar vídeo');
        }
      },
      error: (error) => {
        encodeError = error instanceof Error ? error : new Error('Falha ao codificar vídeo');
      },
    });

    encoder.configure({
      ...supportedEncoder.encoderConfig,
      width: options.width,
      height: options.height,
      framerate: options.fps,
    });

    try {
      for (let frameIndex = 0; frameIndex < options.totalFrames; frameIndex += 1) {
        if (encodeError) throw encodeError;

        await options.renderFrame(frameIndex);

        const timestamp = Math.round((frameIndex * 1_000_000) / options.fps);
        const nextTimestamp = Math.round(((frameIndex + 1) * 1_000_000) / options.fps);
        const duration = nextTimestamp - timestamp;
        const frame = new webCodecsApi.VideoFrame(options.canvas, { timestamp, duration });

        encoder.encode(frame, {
          keyFrame: frameIndex === 0 || frameIndex % options.fps === 0,
        });

        frame.close();

        if ((frameIndex + 1) % Math.max(options.fps, 1) === 0) {
          await encoder.flush();
        }
      }

      await encoder.flush();
      if (encodeError) throw encodeError;

      muxer.finalize();
      return new Blob([target.buffer], { type: 'video/webm' });
    } finally {
      try {
        encoder.close?.();
      } catch {
        // noop
      }
    }
  }, [getSupportedWebCodecsEncoder]);

  const encodeWithLegacyWriter = useCallback(async (options: {
    canvas: HTMLCanvasElement;
    fps: number;
    totalFrames: number;
    renderFrame: (frameIndex: number) => Promise<void>;
  }) => {
    const writer = new WebMWriter({
      quality: 0.95,
      frameRate: options.fps,
    });

    const frameDurationMs = 1000 / options.fps;

    for (let frameIndex = 0; frameIndex < options.totalFrames; frameIndex += 1) {
      await options.renderFrame(frameIndex);
      writer.addFrame(options.canvas, frameDurationMs);
    }

    return await writer.complete();
  }, []);

  const recordCard = useCallback(async (cardIndex: number, options?: { promptSave?: boolean }) => {
    const card = cards[cardIndex];
    if (!card) return;

    setActiveCard(cardIndex);
    setRecording(true);
    setRecordingProgress(0);

    const { w, h } = card.dimensions;
    const filename = `card-${cardIndex + 1}.webm`;
    let cleanup = () => {};
    let saveTarget: SaveFileHandleLike | null = null;

    try {
      if (options?.promptSave !== false) {
        try {
          saveTarget = await createVideoSaveTarget(filename);
        } catch (error) {
          console.error('Save picker error:', error);
        }
      }

      let targetNode: HTMLElement;

      try {
        const recordingSurface = await createRecordingContainer(card);
        cleanup = recordingSurface.cleanup;
        targetNode = recordingSurface.renderRoot;
      } catch (containerError) {
        console.warn('Container capture fallback:', containerError);
        const recordingSurface = await createRecordingIframe(card);
        cleanup = recordingSurface.cleanup;
        targetNode = recordingSurface.targetNode;
      }

      const ownerWindow = targetNode.ownerDocument.defaultView ?? window;
      const animationTimeline = await createControlledAnimationTimeline(targetNode);
      const computedBackground = ownerWindow.getComputedStyle(targetNode).backgroundColor;
      const documentBackground = ownerWindow.getComputedStyle(targetNode.ownerDocument.documentElement).backgroundColor;
      const captureBackground = [computedBackground, documentBackground].find((value) => value && value !== 'rgba(0, 0, 0, 0)');
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.style.backgroundColor = captureBackground || '#000000';
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Falha ao iniciar canvas de gravação');

      const fontEmbedCSS = await getEmbeddedFontCss(targetNode);
      const captureFrame = async () => await captureAnimatedNodeFrame(targetNode, {
        width: w,
        height: h,
        backgroundColor: captureBackground,
        fontEmbedCSS,
        scale: CAPTURE_SCALE,
        foreignObjectRendering: true,
      });

      const paintFrameToCanvas = (frameCanvas: HTMLCanvasElement) => {
        ctx.fillStyle = captureBackground || '#000000';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(frameCanvas, 0, 0, w, h);
      };

      const fps = selectedFps;
      const totalFrames = Math.round((RECORD_DURATION / 1000) * fps);
      const frameDurationMs = 1000 / fps;

      const renderFrame = async (frameIndex: number) => {
        const progress = frameIndex / (totalFrames - 1);
        setRecordingProgress(progress * 100);

        await animationTimeline.setTime(frameIndex * frameDurationMs);
        const frameCanvas = await captureFrame();
        paintFrameToCanvas(frameCanvas);
      };

      let blob = await encodeWithWebCodecs({
        width: w,
        height: h,
        fps,
        canvas,
        totalFrames,
        renderFrame,
      });

      if (!blob) {
        console.warn('WebCodecs indisponível, usando fallback legada de exportação');
        blob = await encodeWithLegacyWriter({
          canvas,
          fps,
          totalFrames,
          renderFrame,
        });
      }

      if (!blob.size) throw new Error('O vídeo foi gerado vazio');
      updateRecordedUrl(cardIndex, blob);

      if (saveTarget) {
        try {
          await writeBlobToVideoFile(saveTarget, blob);
        } catch (error) {
          console.error('File save error:', error);
          triggerBlobDownload(blob, filename);
        }
      } else {
        triggerBlobDownload(blob, filename);
      }

      onRecordComplete?.(cardIndex, blob);
      setRecordingProgress(100);
    } catch (error) {
      console.error('Recording error:', error);
    } finally {
      cleanup();
      setRecording(false);
      setRecordingProgress(0);
    }
  }, [cards, selectedFps, createControlledAnimationTimeline, createRecordingContainer, createRecordingIframe, encodeWithLegacyWriter, encodeWithWebCodecs, onRecordComplete, updateRecordedUrl]);

  const recordAllCards = useCallback(async () => {
    setRecordingAll(true);
    try {
      for (let i = 0; i < cards.length; i++) {
        await recordCard(i, { promptSave: false });
        if (i < cards.length - 1) await delay(250);
      }
    } finally {
      setRecordingAll(false);
    }
  }, [cards.length, recordCard]);

  const downloadVideo = useCallback((cardIndex: number) => {
    const url = recordedVideos[cardIndex];
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `card-${cardIndex + 1}.webm`;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [recordedVideos]);

  const downloadAll = useCallback(() => {
    Object.keys(recordedVideos).forEach((key) => downloadVideo(Number(key)));
  }, [downloadVideo, recordedVideos]);

  if (!currentCard) return null;

  const { w, h } = currentCard.dimensions;
  const aspectRatio = w / h;
  const previewMaxH = 500;
  const previewH = previewMaxH;
  const previewW = previewH * aspectRatio;
  const isRegeneratingCurrent = regeneratingCardIndex === activeCard;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => !recording && !isRegeneratingCurrent && setActiveCard(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCard === i
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
            }`}
          >
            Card {i + 1}
            {recordedVideos[i] && <span className="ml-1 text-green-400">✓</span>}
          </button>
        ))}
      </div>

      <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-black" style={{ width: previewW, height: previewH, margin: '0 auto' }}>
        <iframe
          key={previewKey}
          ref={iframeRef}
          srcDoc={currentCard.html}
          style={{
            width: w,
            height: h,
            border: 'none',
            transform: `scale(${previewH / h})`,
            transformOrigin: 'top left',
          }}
          sandbox="allow-same-origin allow-scripts"
          title={`Card ${activeCard + 1}`}
        />

        {(recording || isRegeneratingCurrent) && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <div className="text-sm text-white/80">
              {isRegeneratingCurrent ? 'Regenerando versão do card...' : `Gravando... ${Math.round(recordingProgress)}%`}
            </div>
            {!isRegeneratingCurrent && (
              <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${recordingProgress}%` }} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => restartPreview(activeCard)}
          disabled={recording || isRegeneratingCurrent}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs hover:bg-white/[0.08] transition-all disabled:opacity-30"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar
        </button>

        {onRegenerateCard && (
          <button
            onClick={() => onRegenerateCard(activeCard)}
            disabled={recording || isRegeneratingCurrent}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-white/80 hover:bg-white/[0.08] transition-all disabled:opacity-30"
          >
            {isRegeneratingCurrent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Regenerar card
          </button>
        )}

        <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] border border-white/[0.08] p-0.5">
          {FPS_OPTIONS.map((fps) => (
            <button
              key={fps}
              onClick={() => setSelectedFps(fps)}
              disabled={recording || isRegeneratingCurrent}
              className={`px-2 py-1.5 rounded-md text-[10px] font-bold transition-all disabled:opacity-30 ${
                selectedFps === fps
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {fps}fps
            </button>
          ))}
        </div>

        <button
          onClick={() => recordCard(activeCard, { promptSave: true })}
          disabled={recording || isRegeneratingCurrent}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: 'white' }}
        >
          {recording ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gravando...</>
          ) : (
            <><Play className="w-3.5 h-3.5" /> Gravar {selectedFps}fps</>
          )}
        </button>

        {recordedVideos[activeCard] && (
          <button
            onClick={() => downloadVideo(activeCard)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        )}

        {onGoHome && (
          <button
            onClick={onGoHome}
            disabled={recording || isRegeneratingCurrent}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs hover:bg-white/[0.08] transition-all disabled:opacity-30"
          >
            <Home className="w-3.5 h-3.5" />
            Voltar à home
          </button>
        )}
      </div>

      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 border-t border-white/[0.06]">
          <button
            onClick={recordAllCards}
            disabled={recording || recordingAll || isRegeneratingCurrent}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] transition-all disabled:opacity-30 cursor-pointer"
          >
            {recordingAll ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gravando cards...</>
            ) : (
              'Gravar todos os cards'
            )}
          </button>

          {Object.keys(recordedVideos).length === cards.length && (
            <button
              onClick={downloadAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download todos
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AnimatedCardRenderer;