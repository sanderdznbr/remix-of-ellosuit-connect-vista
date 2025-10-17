import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingLink: string;
}

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, meetingLink }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link da reunião foi copiado para a área de transferência",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-center">
            Convide usuários para a reunião
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <p className="text-sm text-gray-600 text-center">
            Compartilhe este link para convidar pessoas:
          </p>
          
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="text"
              value={meetingLink}
              readOnly
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
            />
            <Button
              onClick={handleCopy}
              size="sm"
              variant="ghost"
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteModal;
