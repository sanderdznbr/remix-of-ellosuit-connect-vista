import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MeetingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MeetingSettingsModal: React.FC<MeetingSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [provisionalImage, setProvisionalImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `provisional-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-audios')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('meeting-audios')
        .getPublicUrl(filePath);

      setProvisionalImage(data.publicUrl);
      
      // Save to localStorage for persistence
      localStorage.setItem('meeting_provisional_image', data.publicUrl);

      toast({
        title: "Sucesso!",
        description: "Imagem provisória salva com sucesso.",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setProvisionalImage(null);
    localStorage.removeItem('meeting_provisional_image');
    toast({
      title: "Imagem removida",
      description: "A imagem provisória foi removida.",
    });
  };

  React.useEffect(() => {
    // Load saved image on mount
    const saved = localStorage.getItem('meeting_provisional_image');
    if (saved) {
      setProvisionalImage(saved);
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações da Reunião</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Provisional Image Upload */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Imagem Provisória (quando câmera estiver desligada)
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Esta imagem será exibida no lugar do vídeo quando sua câmera estiver desligada.
            </p>
            
            {provisionalImage ? (
              <div className="relative">
                <img
                  src={provisionalImage}
                  alt="Imagem provisória"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  onClick={handleRemoveImage}
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">
                  Arraste uma imagem ou clique para selecionar
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="provisional-image"
                  disabled={uploading}
                />
                <Button
                  onClick={() => document.getElementById('provisional-image')?.click()}
                  disabled={uploading}
                  variant="outline"
                >
                  {uploading ? 'Enviando...' : 'Selecionar Imagem'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={onClose} variant="outline">
              Cancelar
            </Button>
            <Button onClick={onClose}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingSettingsModal;
