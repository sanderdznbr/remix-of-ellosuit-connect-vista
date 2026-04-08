import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Loader2, Download, Play, Pause, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';

interface AnimatedCard {
  html: string;
  cardIndex: number;
  dimensions: { w: number; h: number };
}

interface Props {
  cards: AnimatedCard[];
  onRecordComplete?: (cardIndex: number, blob: Blob) => void;
}

const RECORD_DURATION = 5000; // 5 seconds per card
const CAPTURE_FPS = 12; // 12fps is practical for html2canvas
const FRAME_INTERVAL = 1000 / CAPTURE_FPS;

const AnimatedCardRenderer: React.FC<Props> = ({ cards, onRecordComplete }) => {
  const [activeCard, setActiveCard] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedVideos, setRecordedVideos] = useState<Record<number, string>>({});
  const [recordingAll, setRecordingAll] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderDivRef = useRef<HTMLDivElement>(null);

  const currentCard = cards[activeCard];

  // Record a single card as WebM video using html2canvas
  const recordCard = useCallback(async (cardIndex: number) => {
    const card = cards[cardIndex];
    if (!card) return;

    setRecording(true);
    setRecordingProgress(0);

    const { w, h } = card.dimensions;

    try {
      // Create an offscreen container for rendering
      const container = document.createElement('div');
      container.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${w}px;height:${h}px;overflow:hidden;z-index:-1;`;
      document.body.appendChild(container);

      // Create a shadow root to isolate styles
      const shadow = container.attachShadow({ mode: 'open' });
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `width:${w}px;height:${h}px;overflow:hidden;position:relative;`;
      shadow.appendChild(wrapper);

      // Parse and inject the HTML content
      const parser = new DOMParser();
      const doc = parser.parseFromString(card.html, 'text/html');

      // Extract and inject styles
      const styles = doc.querySelectorAll('style');
      styles.forEach(style => {
        const cloned = document.createElement('style');
        cloned.textContent = style.textContent;
        shadow.appendChild(cloned);
      });

      // Extract Google Fonts @import and load them
      const allStyles = Array.from(styles).map(s => s.textContent || '').join('\n');
      const importMatches = allStyles.matchAll(/@import\s+url\(['"]?(https:\/\/fonts\.googleapis\.com[^'")\s]+)['"]?\)/g);
      const fontLinks: string[] = [];
      for (const match of importMatches) {
        fontLinks.push(match[1]);
      }
      
      // Load fonts in the main document
      for (const fontUrl of fontLinks) {
        if (!document.querySelector(`link[href="${fontUrl}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = fontUrl;
          document.head.appendChild(link);
        }
      }

      // Wait for fonts to load
      if (fontLinks.length > 0) {
        await new Promise(r => setTimeout(r, 1000));
      }

      // Inject body content
      wrapper.innerHTML = doc.body.innerHTML;

      // Copy body styles
      const bodyStyle = doc.body.getAttribute('style');
      if (bodyStyle) {
        wrapper.style.cssText += bodyStyle;
      }

      // Wait for animations to start
      await new Promise(r => setTimeout(r, 300));

      // Set up canvas for MediaRecorder
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      const stream = canvas.captureStream(CAPTURE_FPS);
      
      // Check supported mimeTypes
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(blob);
        };
      });

      mediaRecorder.start(100); // collect data every 100ms

      // Capture frames using html2canvas
      const startTime = Date.now();
      let frameCount = 0;

      const captureLoop = async () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= RECORD_DURATION) {
          mediaRecorder.stop();
          return;
        }

        setRecordingProgress((elapsed / RECORD_DURATION) * 100);

        try {
          const frameCanvas = await html2canvas(wrapper, {
            width: w,
            height: h,
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
          });
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(frameCanvas, 0, 0, w, h);
          frameCount++;
        } catch (e) {
          // Fallback: draw solid color
          ctx.fillStyle = '#0f0f0f';
          ctx.fillRect(0, 0, w, h);
        }

        // Schedule next frame
        const nextFrameDelay = Math.max(0, FRAME_INTERVAL - (Date.now() - startTime - frameCount * FRAME_INTERVAL));
        setTimeout(captureLoop, nextFrameDelay);
      };

      await captureLoop();
      const blob = await recordingPromise;

      // Cleanup
      document.body.removeChild(container);

      const url = URL.createObjectURL(blob);
      setRecordedVideos(prev => ({ ...prev, [cardIndex]: url }));
      setRecording(false);
      setRecordingProgress(100);
      onRecordComplete?.(cardIndex, blob);

      console.log(`✅ Card ${cardIndex + 1} recorded: ${frameCount} frames, ${(blob.size / 1024).toFixed(0)}KB`);
    } catch (err) {
      console.error('Recording error:', err);
      setRecording(false);
      setRecordingProgress(0);
    }
  }, [cards, onRecordComplete]);

  // Record all cards sequentially
  const recordAllCards = useCallback(async () => {
    setRecordingAll(true);
    for (let i = 0; i < cards.length; i++) {
      setActiveCard(i);
      await new Promise(r => setTimeout(r, 300));
      await recordCard(i);
      await new Promise(r => setTimeout(r, 500));
    }
    setRecordingAll(false);
  }, [cards, recordCard]);

  // Download a recorded video
  const downloadVideo = (cardIndex: number) => {
    const url = recordedVideos[cardIndex];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `card-${cardIndex + 1}.webm`;
    a.click();
  };

  // Download all as individual files
  const downloadAll = () => {
    Object.keys(recordedVideos).forEach(key => {
      downloadVideo(parseInt(key));
    });
  };

  if (!currentCard) return null;

  const { w, h } = currentCard.dimensions;
  const aspectRatio = w / h;
  const previewMaxH = 500;
  const previewH = previewMaxH;
  const previewW = previewH * aspectRatio;

  return (
    <div className="space-y-4">
      {/* Card navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => !recording && setActiveCard(i)}
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

      {/* Preview area */}
      <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-black" 
           style={{ width: previewW, height: previewH, margin: '0 auto' }}>
        {recordedVideos[activeCard] ? (
          <video
            src={recordedVideos[activeCard]}
            controls
            autoPlay
            loop
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={currentCard.html}
            style={{ 
              width: w, 
              height: h, 
              border: 'none',
              transform: `scale(${previewH / h})`,
              transformOrigin: 'top left',
            }}
            sandbox="allow-same-origin"
            title={`Card ${activeCard + 1}`}
          />
        )}

        {recording && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <div className="text-sm text-white/80">Gravando... {Math.round(recordingProgress)}%</div>
            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all" 
                style={{ width: `${recordingProgress}%` }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => {
            // Remove recorded video to show live preview again
            if (recordedVideos[activeCard]) {
              setRecordedVideos(prev => {
                const next = { ...prev };
                delete next[activeCard];
                return next;
              });
            }
            // Reload iframe to restart animation
            const iframe = iframeRef.current;
            if (iframe) {
              const doc = iframe.contentDocument || iframe.contentWindow?.document;
              if (doc) {
                doc.open();
                doc.write(currentCard.html);
                doc.close();
              }
            }
          }}
          disabled={recording}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs hover:bg-white/[0.08] transition-all disabled:opacity-30"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar
        </button>

        <button
          onClick={() => recordCard(activeCard)}
          disabled={recording}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
            color: 'white',
          }}
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
      </div>

      {/* Batch controls */}
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 border-t border-white/[0.06]">
          <button
            onClick={recordAllCards}
            disabled={recording || recordingAll}
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
