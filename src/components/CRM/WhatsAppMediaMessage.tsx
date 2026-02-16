import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Image, Music, FileText, Play, Pause, Download, MapPin, User, 
  Sticker, Video, Mic, X, ZoomIn 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaMessageProps {
  messageType: string;
  content: string;
  mediaUrl?: string;
  mediaCaption?: string;
  fromMe: boolean;
}

const WhatsAppMediaMessage: React.FC<MediaMessageProps> = ({
  messageType,
  content,
  mediaUrl,
  mediaCaption,
  fromMe
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenType, setFullscreenType] = useState<'image' | 'video' | 'document'>('image');
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [mediaUrl]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audioRef.current.currentTime = percentage * audioDuration;
    setAudioProgress(percentage * 100);
  };

  const handleDownload = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  // Get icon and label based on message type
  const getMediaInfo = () => {
    switch (messageType) {
      case 'image':
        return { icon: Image, label: 'Foto' };
      case 'video':
        return { icon: Video, label: 'Vídeo' };
      case 'audio':
      case 'ptt':
        return { icon: messageType === 'ptt' ? Mic : Music, label: 'Áudio' };
      case 'document':
        return { icon: FileText, label: 'Documento' };
      case 'sticker':
        return { icon: Sticker, label: 'Figurinha' };
      case 'location':
        return { icon: MapPin, label: 'Localização' };
      case 'contact':
        return { icon: User, label: 'Contato' };
      default:
        return { icon: FileText, label: 'Arquivo' };
    }
  };

  const { icon: Icon, label } = getMediaInfo();

  const fullscreenModal = showFullscreen && mediaUrl ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
      onClick={() => setShowFullscreen(false)}
    >
      <button
        onClick={() => setShowFullscreen(false)}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
      >
        <X className="h-8 w-8" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDownload(mediaUrl, fullscreenType === 'video' ? 'video.mp4' : 'arquivo');
        }}
        className="absolute top-4 left-4 p-2 text-white/80 hover:text-white transition-colors flex items-center gap-2 z-10"
      >
        <Download className="h-6 w-6" />
        <span className="text-sm">Baixar</span>
      </button>
      {fullscreenType === 'image' && (
        <img src={mediaUrl} alt="Imagem em tela cheia" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
      )}
      {fullscreenType === 'video' && (
        <video src={mediaUrl} controls autoPlay className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()} />
      )}
      {fullscreenType === 'document' && (
        <iframe src={mediaUrl} className="w-full h-full max-w-4xl rounded-lg bg-white" title="Documento" onClick={(e) => e.stopPropagation()} />
      )}
    </div>,
    document.body
  ) : null;

  // === IMAGE ===
  if (messageType === 'image' && mediaUrl && !imageError) {
    return (
      <>
        <div className="space-y-1">
          <div className="relative rounded-lg overflow-hidden max-w-[240px] group">
            <img
              src={mediaUrl}
              alt="Imagem"
              className="w-full h-auto rounded-lg cursor-pointer transition-transform hover:scale-[1.02]"
              onError={() => setImageError(true)}
              onClick={() => { setFullscreenType('image'); setShowFullscreen(true); }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(mediaUrl, 'imagem.jpg'); }}
              className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
            >
              <Download className="h-4 w-4 text-white" />
            </button>
          </div>
          {mediaCaption && (
            <p className="text-sm whitespace-pre-wrap">{mediaCaption}</p>
          )}
        </div>
        {fullscreenModal}
      </>
    );
  }

  // === AUDIO / PTT (WhatsApp Style) ===
  if ((messageType === 'audio' || messageType === 'ptt') && mediaUrl) {
    const isPTT = messageType === 'ptt';
    
    return (
      <div className="space-y-1">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-2xl min-w-[220px] max-w-[280px]",
          fromMe 
            ? "bg-white/20" 
            : "bg-gray-100 dark:bg-white/5"
        )}>
          {/* Play/Pause Button */}
          <button
            onClick={toggleAudio}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
              isPTT 
                ? "bg-[#25D366] hover:bg-[#22c55e]" 
                : "bg-[#00a884] hover:bg-[#008f72]"
            )}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-white" fill="white" />
            ) : (
              <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
            )}
          </button>

          {/* Waveform / Progress */}
          <div className="flex-1 flex flex-col gap-1">
            <div 
              className="h-[24px] flex items-center gap-[2px] cursor-pointer relative"
              onClick={handleProgressClick}
            >
              {/* Simulated Waveform Bars */}
              {Array.from({ length: 30 }).map((_, i) => {
                const heights = [12, 8, 16, 10, 20, 14, 8, 18, 12, 6, 14, 20, 10, 16, 8, 12, 18, 6, 14, 10, 20, 8, 16, 12, 6, 18, 14, 10, 8, 12];
                const isActive = (i / 30) * 100 <= audioProgress;
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-[3px] rounded-full transition-colors",
                      isActive 
                        ? (fromMe ? "bg-[#25D366]" : "bg-[#25D366]")
                        : "bg-gray-400/40"
                    )}
                    style={{ height: `${heights[i % heights.length]}px` }}
                  />
                );
              })}
            </div>
            
            {/* Duration */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {audioDuration > 0 
                  ? formatDuration(isPlaying ? (audioProgress / 100) * audioDuration : audioDuration)
                  : '0:00'
                }
              </span>
              {isPTT && (
                <Mic className="h-3 w-3 text-[#25D366]" />
              )}
            </div>
          </div>

          {/* Microphone Icon for PTT */}
          {isPTT && (
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
          )}

          <audio
            ref={audioRef}
            src={mediaUrl}
            preload="metadata"
            className="hidden"
          />
        </div>
        {mediaCaption && (
          <p className="text-sm whitespace-pre-wrap mt-1">{mediaCaption}</p>
        )}
      </div>
    );
  }

  // === VIDEO ===
  if (messageType === 'video' && mediaUrl) {
    return (
      <>
        <div className="space-y-1">
          <div 
            className="relative rounded-lg overflow-hidden max-w-[240px] bg-black cursor-pointer group"
            onClick={() => { setFullscreenType('video'); setShowFullscreen(true); }}
          >
            <video
              src={mediaUrl}
              className="w-full h-auto rounded-lg"
              preload="metadata"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
              <Play className="h-10 w-10 text-white drop-shadow-lg" fill="white" />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(mediaUrl, 'video.mp4'); }}
              className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
            >
              <Download className="h-4 w-4 text-white" />
            </button>
          </div>
          {mediaCaption && (
            <p className="text-sm whitespace-pre-wrap">{mediaCaption}</p>
          )}
        </div>
        {fullscreenModal}
      </>
    );
  }

  // === DOCUMENT ===
  if (messageType === 'document' && mediaUrl) {
    const fileName = mediaCaption || content || 'Documento';
    const isPreviewable = mediaUrl.match(/\.(pdf|png|jpg|jpeg|gif|webp|svg)$/i);
    return (
      <>
        <div 
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors min-w-[200px] max-w-[280px]",
            fromMe 
              ? "bg-white/20 hover:bg-white/30" 
              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
          onClick={() => {
            if (isPreviewable) {
              setFullscreenType('document');
              setShowFullscreen(true);
            } else {
              window.open(mediaUrl, '_blank');
            }
          }}
        >
          <div className={cn("w-10 h-12 rounded flex items-center justify-center flex-shrink-0", fromMe ? "bg-white/30" : "bg-red-500")}>
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium truncate", fromMe ? "text-white" : "")}>{fileName}</p>
            <p className={cn("text-xs", fromMe ? "text-white/70" : "text-gray-500 dark:text-gray-400")}>Toque para visualizar</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(mediaUrl, fileName); }}
            className="p-1"
          >
            <Download className={cn("h-5 w-5 flex-shrink-0", fromMe ? "text-white/80" : "text-gray-500")} />
          </button>
        </div>
        {fullscreenModal}
      </>
    );
  }

  // === STICKER ===
  if (messageType === 'sticker' && mediaUrl) {
    return (
      <div className="max-w-[150px]">
        <img
          src={mediaUrl}
          alt="Sticker"
          className="w-full h-auto"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // === PLACEHOLDER (No URL) ===
  return (
    <div className="space-y-1">
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg",
        fromMe 
          ? "bg-[#005c4b]/30" 
          : "bg-gray-100 dark:bg-gray-800"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          messageType === 'image' && "bg-emerald-500",
          messageType === 'video' && "bg-purple-500",
          (messageType === 'audio' || messageType === 'ptt') && "bg-[#25D366]",
          messageType === 'document' && "bg-red-500",
          messageType === 'sticker' && "bg-pink-500",
          messageType === 'location' && "bg-red-500",
          messageType === 'contact' && "bg-cyan-500",
          !['image', 'video', 'audio', 'ptt', 'document', 'sticker', 'location', 'contact'].includes(messageType) && "bg-gray-500"
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Mídia não disponível
          </p>
        </div>
      </div>
      {mediaCaption && (
        <p className="text-sm whitespace-pre-wrap mt-1">{mediaCaption}</p>
      )}
      {content && content !== `[${label}]` && !content.startsWith('[') && (
        <p className="text-sm whitespace-pre-wrap mt-1">{content}</p>
      )}
    </div>
  );
};

export default WhatsAppMediaMessage;
