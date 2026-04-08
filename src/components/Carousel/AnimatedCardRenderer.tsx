import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Loader2, Download, Play, Pause, RotateCcw } from 'lucide-react';

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

const AnimatedCardRenderer: React.FC<Props> = ({ cards, onRecordComplete }) => {
  const [activeCard, setActiveCard] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedVideos, setRecordedVideos] = useState<Record<number, string>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentCard = cards[activeCard];

  // Record a single card as WebM video
  const recordCard = useCallback(async (cardIndex: number) => {
    const iframe = iframeRef.current;
    const canvas = canvasRef.current;
    if (!iframe || !canvas || !currentCard) return;

    setRecording(true);
    setRecordingProgress(0);

    const { w, h } = currentCard.dimensions;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Use MediaRecorder on canvas
    const stream = canvas.captureStream(30); // 30fps
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideos(prev => ({ ...prev, [cardIndex]: url }));
      setRecording(false);
      onRecordComplete?.(cardIndex, blob);
    };

    mediaRecorder.start();

    // Reload iframe to restart animations
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(currentCard.html);
      iframeDoc.close();
    }

    // Capture frames for the duration
    const startTime = Date.now();
    const captureFrame = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / RECORD_DURATION, 1);
      setRecordingProgress(progress * 100);

      if (elapsed < RECORD_DURATION) {
        try {
          // Draw iframe content to canvas
          const iframeDoc2 = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc2?.body) {
            // Use html2canvas-like approach via foreignObject SVG
            const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
              <foreignObject width="100%" height="100%">
                ${new XMLSerializer().serializeToString(iframeDoc2.documentElement)}
              </foreignObject>
            </svg>`;
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, w, h);
            };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
          }
        } catch (e) {
          // Cross-origin issues — fill with solid color
          ctx.fillStyle = '#0f0f0f';
          ctx.fillRect(0, 0, w, h);
        }
        requestAnimationFrame(captureFrame);
      } else {
        mediaRecorder.stop();
      }
    };

    requestAnimationFrame(captureFrame);
  }, [currentCard, onRecordComplete]);

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
            onClick={() => setActiveCard(i)}
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

      {/* Hidden canvas for recording */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => {
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs hover:bg-white/[0.08] transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar
        </button>

        <button
          onClick={() => recordCard(activeCard)}
          disabled={recording}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20 transition-all"
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
            onClick={async () => {
              for (let i = 0; i < cards.length; i++) {
                setActiveCard(i);
                await new Promise(r => setTimeout(r, 500)); // Wait for iframe to load
                await new Promise<void>((resolve) => {
                  const origOnComplete = onRecordComplete;
                  recordCard(i);
                  // Wait for recording duration + buffer
                  setTimeout(resolve, RECORD_DURATION + 1000);
                });
              }
            }}
            disabled={recording}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] transition-all disabled:opacity-30"
          >
            Gravar todos os cards
          </button>

          {Object.keys(recordedVideos).length === cards.length && (
            <button
              onClick={downloadAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all"
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
