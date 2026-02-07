import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Loader2, CheckCircle2, RefreshCw, Smartphone, AlertCircle, Clock } from 'lucide-react';
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

const QR_TIMEOUT_MS = 120000; // 2 minutos
const POLL_INTERVAL_MS = 3000; // 3 segundos (mais lento para evitar sobrecarga)

const WhatsAppQRModal: React.FC<WhatsAppQRModalProps> = ({
  isOpen,
  onClose,
  companyId,
  userId,
  onSuccess
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'loading' | 'qr' | 'connected' | 'timeout'>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState(false);
  const [phoneInfo, setPhoneInfo] = useState<{ phoneNumber?: string; pushName?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Auto-create instance when modal opens
  useEffect(() => {
    if (isOpen && !sessionId) {
      startTimeRef.current = Date.now();
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
      setPollCount(0);
      setElapsedTime(0);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isOpen]);

  // Timer for elapsed time
  useEffect(() => {
    if (step === 'qr' && !qrCode) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, qrCode]);

  // Timeout handler
  useEffect(() => {
    if (step === 'qr') {
      timeoutRef.current = setTimeout(() => {
        if (!qrCode && step === 'qr') {
          setStep('timeout');
          toast({
            title: 'Tempo esgotado',
            description: 'Não foi possível gerar o QR Code. Tente novamente.',
            variant: 'destructive'
          });
        }
      }, QR_TIMEOUT_MS);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [step, qrCode]);

  // Poll for QR and status
  useEffect(() => {
    if ((step !== 'qr' && step !== 'loading') || !sessionId) return;

    let isMounted = true;

    const pollQRAndStatus = async () => {
      if (!isMounted) return;
      
      setPollCount(prev => prev + 1);
      
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
          
          if (qrData.qrCode && qrData.qrCode.startsWith('data:image')) {
            setQrCode(qrData.qrCode);
            setStep('qr');
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
    const interval = setInterval(pollQRAndStatus, POLL_INTERVAL_MS);
    
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

  // Força regeneração do QR Code deletando e recriando instância no servidor
  const regenerateQRCode = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setQrCode(null);
    setPollCount(0);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    
    try {
      toast({ title: 'Regenerando QR Code...', description: 'Recriando sessão no servidor' });
      
      const { data, error } = await supabase.functions.invoke('whatsapp-api', {
        body: { action: 'regenerate_qr', sessionId }
      });

      if (error) throw error;

      console.log('[QR Modal] Regenerate response:', data);
      
      if (data?.qrCode && data.qrCode.startsWith('data:image')) {
        setQrCode(data.qrCode);
        toast({ title: 'QR Code gerado!', description: 'Escaneie com seu WhatsApp' });
      } else {
        toast({ title: 'Aguarde...', description: 'O QR Code será gerado em instantes' });
      }
    } catch (e: any) {
      console.error('Error regenerating QR:', e);
      toast({ 
        title: 'Erro', 
        description: e.message || 'Erro ao regenerar QR Code', 
        variant: 'destructive' 
      });
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
                <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
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

        {step === 'timeout' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Tempo Esgotado</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center px-4">
              Não foi possível gerar o QR Code em 2 minutos.<br />
              Verifique se o servidor Baileys está funcionando.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => {
                setStep('loading');
                setSessionId(null);
                setQrCode(null);
                setPollCount(0);
                setElapsedTime(0);
                startTimeRef.current = Date.now();
                createInstance();
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        {step === 'qr' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4">
              {qrCode && qrCode.startsWith('data:image') ? (
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
                <div className="w-64 h-64 bg-muted rounded-lg flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Gerando QR Code...<br />
                    <span className="text-xs">Aguardando servidor ({elapsedTime}s)</span>
                  </p>
                  {pollCount > 5 && (
                    <p className="text-xs text-amber-600 text-center px-4">
                      Tentativa {pollCount}... isso pode levar até 2 minutos
                    </p>
                  )}
                  {pollCount > 10 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={regenerateQRCode}
                      disabled={loading}
                      className="mt-2"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Gerar Novo QR Code
                    </Button>
                  )}
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

              {status === 'initializing' && (
                <div className="flex items-center gap-2 mt-4 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Inicializando sessão no servidor...</span>
                </div>
              )}

              {status === 'waiting_qr' && qrCode && (
                <div className="flex items-center gap-2 mt-4 text-green-600">
                  <QrCode className="h-4 w-4" />
                  <span className="text-sm">QR Code pronto para escanear!</span>
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
