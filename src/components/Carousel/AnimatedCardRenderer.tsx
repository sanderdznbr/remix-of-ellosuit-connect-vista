import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Download, Play, RotateCcw, Home, Sparkles } from 'lucide-react';
import {
  captureAnimatedNodeFrame,
  createVideoSaveTarget,
  getEmbeddedFontCss,
  type SaveFileHandleLike,
  triggerBlobDownload,
  writeBlobToVideoFile,
} from './animatedFrameCapture';

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

const RECORD_DURATION = 5000;
const CAPTURE_FPS = 18;
const FRAME_INTERVAL = 1000 / CAPTURE_FPS;
const CAPTURE_SCALE = 2;
const CAPTURE_ROOT_CLASS = 'animated-card-capture-root';

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

  const restartPreview = useCallback((cardIndex: number) => {
    setPreviewNonce((prev) => ({ ...prev, [cardIndex]: (prev[cardIndex] ?? 0) + 1 }));
  }, []);

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

    const container = document.createElement('div');
    container.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;height:${h}px;pointer-events:none;overflow:hidden;z-index:-9999;`;
    document.body.appendChild(container);

    // Parse the card HTML to extract styles and body content
    const parser = new DOMParser();
    const parsed = parser.parseFromString(card.html, 'text/html');

    // Create the render root inside the container
    const renderRoot = document.createElement('div');
    renderRoot.className = CAPTURE_ROOT_CLASS;
    renderRoot.setAttribute('data-animated-capture-root', 'true');
    renderRoot.style.cssText = `width:${w}px;height:${h}px;overflow:hidden;position:relative;display:block;isolation:isolate;margin:0;padding:0;contain:layout paint style;`;
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

    // Give animations a moment to start
    await delay(800);

    const cleanup = () => {
      injectedLinks.forEach((link) => {
        if (link.parentNode) link.parentNode.removeChild(link);
      });
      if (container.parentNode) container.parentNode.removeChild(container);
    };

    return { renderRoot, cleanup };
  }, []);

  const updateRecordedUrl = useCallback((cardIndex: number, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setRecordedVideos((prev) => {
      if (prev[cardIndex]) URL.revokeObjectURL(prev[cardIndex]);
      return { ...prev, [cardIndex]: url };
    });
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
    let mediaRecorder: MediaRecorder | null = null;
    let saveTarget: SaveFileHandleLike | null = null;

    try {
      if (options?.promptSave !== false) {
        try {
          saveTarget = await createVideoSaveTarget(filename);
        } catch (error) {
          console.error('Save picker error:', error);
        }
      }

      const recordingContainer = await createRecordingContainer(card);
      cleanup = recordingContainer.cleanup;
      const targetNode = recordingContainer.renderRoot;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Falha ao iniciar canvas de gravação');

      const stream = canvas.captureStream(CAPTURE_FPS);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      const computedBackground = window.getComputedStyle(targetNode).backgroundColor;
      const captureBackground = computedBackground && computedBackground !== 'rgba(0, 0, 0, 0)'
        ? computedBackground
        : undefined;
      const fontEmbedCSS = await getEmbeddedFontCss(targetNode);
      const captureFrame = async () => await captureAnimatedNodeFrame(targetNode, {
        width: w,
        height: h,
        backgroundColor: captureBackground,
        fontEmbedCSS,
        scale: CAPTURE_SCALE,
      });

      const firstFrame = await captureFrame();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(firstFrame, 0, 0, w, h);

      mediaRecorder.start(250);

      const startedAt = performance.now();
      while (performance.now() - startedAt < RECORD_DURATION) {
        const frameStartedAt = performance.now();
        const elapsed = frameStartedAt - startedAt;
        setRecordingProgress((elapsed / RECORD_DURATION) * 100);

        const frameCanvas = await captureFrame();

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(frameCanvas, 0, 0, w, h);

        const remaining = FRAME_INTERVAL - (performance.now() - frameStartedAt);
        if (remaining > 0) await delay(remaining);
      }

      const finalFrame = await captureFrame();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(finalFrame, 0, 0, w, h);

      mediaRecorder.stop();
      stream.getTracks().forEach((track) => track.stop());

      const blob = await recordingPromise;
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
  }, [cards, createRecordingContainer, onRecordComplete, updateRecordedUrl]);

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

        <button
          onClick={() => recordCard(activeCard, { promptSave: true })}
          disabled={recording || isRegeneratingCurrent}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: 'white' }}
        >
          {recording ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gravando...</>
          ) : (
            <><Play className="w-3.5 h-3.5" /> Gravar como vídeo</>
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