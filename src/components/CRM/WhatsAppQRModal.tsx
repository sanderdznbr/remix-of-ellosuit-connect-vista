import React, { useState, useEffect } from 'react';
import { QrCode, Loader2, CheckCircle2, XCircle, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  userId: string;
  onSuccess: (session: any) => void;
}

const WhatsAppQRModal: React.FC<WhatsAppQRModalProps> = ({
  isOpen,
  onClose,
  companyId,
  userId,
  onSuccess
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'name' | 'qr' | 'connected'>('name');
  const [instanceName, setInstanceName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      setStep('name');
      setInstanceName('');
      setSessionId(null);
      setQrCode(null);
      setStatus('disconnected');
    }
  }, [isOpen]);

  // Poll for status when showing QR
  useEffect(() => {
    if (step !== 'qr' || !sessionId) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-api', {
          body: { action: 'check_status', sessionId }
        });

        if (!error && data) {
          setStatus(data.status);
          if (data.status === 'connected') {
            setStep('connected');
            // Get session details
            const { data: sessionData } = await supabase
              .from('whatsapp_sessions')
              .select('*')
              .eq('id', sessionId)
              .single();
            
            if (sessionData) {
              onSuccess(sessionData);
            }
          }
        }
      } catch (e) {
        console.error('Status check error:', e);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [step, sessionId, onSuccess]);

  const createInstance = async () => {
    if (!instanceName.trim()) {
      toast({ title: 'Erro', description: 'Digite um nome para a instância', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-api', {
        body: {
          action: 'create_instance',
          instanceName: instanceName.trim().toLowerCase().replace(/\s+/g, '-'),
          companyId,
          userId
        }
      });

      if (error) throw error;

      setSessionId(data.session.id);
      
      // Get QR code
      const qrResponse = await supabase.functions.invoke('whatsapp-api', {
        body: { action: 'get_qr_code', sessionId: data.session.id }
      });

      if (qrResponse.data) {
        setQrCode(qrResponse.data.qrCode);
        setIsDemo(qrResponse.data.isDemo || false);
      }
      
      setStep('qr');
    } catch (e: any) {
      console.error('Error creating instance:', e);
      toast({ 
        title: 'Erro', 
        description: e.message || 'Erro ao criar instância', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshQRCode = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-api', {
        body: { action: 'get_qr_code', sessionId }
      });

      if (!error && data) {
        setQrCode(data.qrCode);
      }
    } catch (e) {
      console.error('Error refreshing QR:', e);
    } finally {
      setLoading(false);
    }
  };

  const simulateConnection = async () => {
    // For demo mode, simulate connection
    if (!sessionId) return;
    
    setLoading(true);
    try {
      await supabase
        .from('whatsapp_sessions')
        .update({
          status: 'connected',
          phone_number: '+55 11 99999-9999',
          phone_name: 'Demo WhatsApp',
          connected_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      setStatus('connected');
      setStep('connected');
      
      const { data: sessionData } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionData) {
        onSuccess(sessionData);
      }
    } catch (e) {
      console.error('Error simulating connection:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            {step === 'name' && 'Dê um nome para identificar esta conexão'}
            {step === 'qr' && 'Escaneie o QR Code com seu WhatsApp'}
            {step === 'connected' && 'WhatsApp conectado com sucesso!'}
          </DialogDescription>
        </DialogHeader>

        {step === 'name' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome da Instância</label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Ex: vendas, suporte, marketing..."
                onKeyPress={(e) => e.key === 'Enter' && createInstance()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use um nome único para identificar este WhatsApp
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={createInstance} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 'qr' && (
          <div className="space-y-4">
            {isDemo && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Modo Demo:</strong> Para funcionalidade completa, configure a Evolution API.
                </p>
              </div>
            )}

            <div className="flex flex-col items-center py-4">
              {qrCode ? (
                <div className="relative">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64 rounded-lg border"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={refreshQRCode}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              ) : (
                <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  1. Abra o WhatsApp no seu celular<br />
                  2. Toque em Menu &gt; Aparelhos conectados<br />
                  3. Toque em Conectar um aparelho<br />
                  4. Aponte seu celular para esta tela
                </p>
              </div>

              {status === 'connecting' && (
                <div className="flex items-center gap-2 mt-4 text-amber-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Aguardando conexão...</span>
                </div>
              )}
            </div>

            {isDemo && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={simulateConnection} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Simular Conexão (Demo)
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'connected' && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Conectado com Sucesso!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Seu WhatsApp está pronto para receber mensagens.
            </p>
            <Button onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppQRModal;
