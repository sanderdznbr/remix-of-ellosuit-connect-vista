import React, { useState, useEffect } from 'react';
import { QrCode, Loader2, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  const [step, setStep] = useState<'loading' | 'qr' | 'connected'>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState(false);
  const [phoneInfo, setPhoneInfo] = useState<{ phoneNumber?: string; pushName?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-create instance when modal opens
  useEffect(() => {
    if (isOpen && !sessionId) {
      createInstance();
    }
  }, [isOpen]);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      setStep('loading');
      setSessionId(null);
      setQrCode(null);
      setStatus('disconnected');
      setPhoneInfo(null);
      setError(null);
    }
  }, [isOpen]);

  // Poll for QR and status
  useEffect(() => {
    if (step !== 'qr' || !sessionId) return;

    let isMounted = true;

    const pollQRAndStatus = async () => {
      if (!isMounted) return;
      
      try {
        // Check status
        const { data: statusData, error: statusError } = await supabase.functions.invoke('whatsapp-api', {
          body: { action: 'check_status', sessionId }
        });

        if (!statusError && statusData) {
          console.log('[QR Modal] Status:', statusData);
          setStatus(statusData.status);
          
          if (statusData.status === 'connected' || statusData.isConnected) {
            setPhoneInfo({
              phoneNumber: statusData.phoneNumber,
              pushName: statusData.pushName
            });
            setStep('connected');
            
            const { data: sessionData } = await supabase
              .from('whatsapp_sessions')
              .select('*')
              .eq('id', sessionId)
              .maybeSingle();
            
            if (sessionData) {
              onSuccess(sessionData);
            }
            return;
          }
        }
        
        // Get QR code if not connected
        const { data: qrData, error: qrError } = await supabase.functions.invoke('whatsapp-api', {
          body: { action: 'get_qr_code', sessionId }
        });

        if (!qrError && qrData && isMounted) {
          console.log('[QR Modal] QR Data:', { hasQR: !!qrData.qrCode, status: qrData.status });
          if (qrData.qrCode) {
            setQrCode(qrData.qrCode);
          }
          if (qrData.isConnected) {
            setPhoneInfo({
              phoneNumber: qrData.phoneNumber,
              pushName: qrData.pushName
            });
            setStep('connected');
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    };

    pollQRAndStatus();
    const interval = setInterval(pollQRAndStatus, 2000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [step, sessionId, onSuccess]);

  const createInstance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Generate unique instance name
      const instanceName = `whatsapp-${Date.now()}`;
      
      console.log('[QR Modal] Creating instance:', instanceName);
      
      const { data, error } = await supabase.functions.invoke('whatsapp-api', {
        body: {
          action: 'create_instance',
          instanceName,
          companyId,
          userId
          // Server URL comes from BAILEYS_SERVER_URL secret in edge function
        }
      });

      if (error) throw error;

      if (!data?.session?.id) {
        throw new Error('Sessão não criada corretamente');
      }

      setSessionId(data.session.id);
      console.log('[QR Modal] Session created:', data.session.id);
      
      // Get initial QR code
      const qrResponse = await supabase.functions.invoke('whatsapp-api', {
        body: { 
          action: 'get_qr_code', 
          sessionId: data.session.id 
        }
      });

      if (qrResponse.data?.qrCode) {
        setQrCode(qrResponse.data.qrCode);
      }
      
      setStep('qr');
      
      toast({
        title: 'Aguardando conexão',
        description: 'Escaneie o QR Code com seu WhatsApp'
      });
    } catch (e: any) {
      console.error('Error creating instance:', e);
      setError(e.message || 'Erro ao criar instância');
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

      if (!error && data?.qrCode) {
        setQrCode(data.qrCode);
        toast({ title: 'QR Code atualizado' });
      }
    } catch (e) {
      console.error('Error refreshing QR:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            {step === 'loading' && 'Preparando conexão...'}
            {step === 'qr' && 'Escaneie o QR Code com seu WhatsApp'}
            {step === 'connected' && 'WhatsApp conectado com sucesso!'}
          </DialogDescription>
        </DialogHeader>

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            {error ? (
              <div className="text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={createInstance} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Conectando ao servidor...</p>
              </>
            )}
          </div>
        )}

        {step === 'qr' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4">
              {qrCode ? (
                <div className="relative">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64 rounded-lg border bg-white"
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

              <div className="text-center mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  1. Abra o WhatsApp no seu celular<br />
                  2. Toque em <strong>Menu</strong> &gt; <strong>Aparelhos conectados</strong><br />
                  3. Toque em <strong>Conectar um aparelho</strong><br />
                  4. Aponte seu celular para esta tela
                </p>
              </div>

              {status === 'connecting' && (
                <div className="flex items-center gap-2 mt-4 text-amber-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Aguardando conexão...</span>
                </div>
              )}

              {status === 'waiting_qr' && (
                <div className="flex items-center gap-2 mt-4 text-blue-600">
                  <QrCode className="h-4 w-4" />
                  <span className="text-sm">QR Code pronto para escanear</span>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'connected' && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Conectado com Sucesso!</h3>
            
            {phoneInfo && (
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Número:</strong> {phoneInfo.phoneNumber}<br />
                  {phoneInfo.pushName && (
                    <><strong>Nome:</strong> {phoneInfo.pushName}</>
                  )}
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground mb-6">
              Seu WhatsApp está pronto para receber e enviar mensagens.
            </p>
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
              Começar a usar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppQRModal;
