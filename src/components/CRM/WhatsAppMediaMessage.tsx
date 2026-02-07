import React, { useState } from 'react';
import { Image, Music, FileText, Play, Pause, Download, MapPin, User, Sticker, Video, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [imageError, setImageError] = useState(false);

  const toggleAudio = () => {
    if (audioRef) {
      if (isPlaying) {
        audioRef.pause();
      } else {
        audioRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Get icon and color based on message type
  const getMediaInfo = () => {
    switch (messageType) {
      case 'image':
        return { 
          icon: Image, 
          label: 'Imagem', 
          color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' 
        };
      case 'video':
        return { 
          icon: Video, 
          label: 'Vídeo', 
          color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' 
        };
      case 'audio':
      case 'ptt':
        return { 
          icon: messageType === 'ptt' ? Mic : Music, 
          label: messageType === 'ptt' ? 'Áudio' : 'Música', 
          color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' 
        };
      case 'document':
        return { 
          icon: FileText, 
          label: 'Documento', 
          color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400' 
        };
      case 'sticker':
        return { 
          icon: Sticker, 
          label: 'Sticker', 
          color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400' 
        };
      case 'location':
        return { 
          icon: MapPin, 
          label: 'Localização', 
          color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' 
        };
      case 'contact':
        return { 
          icon: User, 
          label: 'Contato', 
          color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400' 
        };
      default:
        return { 
          icon: FileText, 
          label: 'Mídia', 
          color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400' 
        };
    }
  };

  const { icon: Icon, label, color } = getMediaInfo();

  // If we have a media URL for images, try to display it
  if (messageType === 'image' && mediaUrl && !imageError) {
    return (
      <div className="space-y-1">
        <div className="relative rounded-lg overflow-hidden max-w-[200px]">
          <img
            src={mediaUrl}
            alt="Imagem"
            className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onError={() => setImageError(true)}
            onClick={() => window.open(mediaUrl, '_blank')}
          />
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-white" />
          </a>
        </div>
        {mediaCaption && (
          <p className="text-sm whitespace-pre-wrap">{mediaCaption}</p>
        )}
      </div>
    );
  }

  // If we have a media URL for audio/ptt
  if ((messageType === 'audio' || messageType === 'ptt') && mediaUrl) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-3 min-w-[180px]">
          <button
            onClick={toggleAudio}
            className={cn(
              "flex-shrink-0 p-2.5 rounded-full transition-colors",
              color
            )}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1">
            <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
              <div className="h-full w-0 bg-current transition-all" />
            </div>
          </div>
          <audio
            ref={(ref) => setAudioRef(ref)}
            src={mediaUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
        {mediaCaption && (
          <p className="text-sm whitespace-pre-wrap">{mediaCaption}</p>
        )}
      </div>
    );
  }

  // Placeholder for media without URL (most common case)
  return (
    <div className="space-y-1">
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        color
      )}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
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
