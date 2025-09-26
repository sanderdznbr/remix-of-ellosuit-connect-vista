import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Copy, 
  Share2, 
  QrCode,
  Mail,
  MessageCircle,
  Check
} from 'lucide-react';

interface ShareMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
}

const ShareMeetingModal: React.FC<ShareMeetingModalProps> = ({
  isOpen,
  onClose,
  roomName
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const meetingUrl = `${window.location.origin}/meeting/${roomName}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link da reunião foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const handleShareWhatsApp = () => {
    const message = `Você foi convidado para uma reunião!\n\nSala: ${roomName}\nLink: ${meetingUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareEmail = () => {
    const subject = `Convite para reunião - Sala ${roomName}`;
    const body = `Você foi convidado para participar de uma reunião.\n\nSala: ${roomName}\nLink: ${meetingUrl}\n\nClique no link para entrar na reunião.`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = emailUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Convidar pessoas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Room Info */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-sm text-gray-300 mb-1">Sala de reunião</div>
            <div className="text-lg font-semibold text-white">{roomName}</div>
          </div>

          {/* Copy Link */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white">Link da reunião</label>
            <div className="flex gap-2">
              <Input 
                value={meetingUrl}
                readOnly
                className="bg-gray-800 border-gray-600 text-white text-sm"
              />
              <Button 
                onClick={handleCopyLink}
                className="px-3 bg-primary hover:bg-primary/90"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white">Compartilhar via</label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleShareWhatsApp}
                variant="outline"
                className="bg-green-600 hover:bg-green-700 border-green-600 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              
              <Button
                onClick={handleShareEmail}
                variant="outline"
                className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
              >
                <Mail className="h-4 w-4 mr-2" />
                E-mail
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-900/30 border border-blue-700/50 p-4 rounded-lg">
            <div className="text-sm text-blue-200">
              <strong>Como entrar:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Clique no link compartilhado</li>
                <li>Permita o acesso à câmera e microfone</li>
                <li>Digite seu nome e entre na reunião</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareMeetingModal;