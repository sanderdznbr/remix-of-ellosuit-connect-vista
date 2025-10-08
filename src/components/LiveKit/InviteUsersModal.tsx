import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

const InviteUsersModal: React.FC<InviteUsersModalProps> = ({
  isOpen,
  onClose,
  roomCode,
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const meetingLink = `${window.location.origin}/livekit/${roomCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link da reunião foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar usuários</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Compartilhe este link para convidar pessoas para a reunião:
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={meetingLink}
              readOnly
              className="flex-1"
            />
            <Button
              onClick={handleCopy}
              size="icon"
              variant="outline"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUsersModal;
