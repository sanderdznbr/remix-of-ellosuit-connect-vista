import React, { useState, useEffect } from 'react';
import { QrCode, Loader2, CheckCircle2, RefreshCw, Smartphone, Server, ExternalLink, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [step, setStep] = useState<'config' | 'qr' | 'connected'>('config');
  const [instanceName, setInstanceName] = useState('');
  const [baileysServerUrl, setBaileysServerUrl] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState(false);
  const [testingServer, setTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [phoneInfo, setPhoneInfo] = useState<{ phoneNumber?: string; pushName?: string } | null>(null);
  const [pollingQR, setPollingQR] = useState(false);

  // Load saved server URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('baileys_server_url');
    if (savedUrl) {
      setBaileysServerUrl(savedUrl);
    }
  }, []);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      setStep('config');
      setInstanceName('');
      setSessionId(null);
      setQrCode(null);
      setStatus('disconnected');
      setServerStatus('unknown');
      setPhoneInfo(null);
      setPollingQR(false);
    }
  }, [isOpen]);

  // Poll for QR and status when showing QR
  useEffect(() => {
    if (step !== 'qr' || !sessionId) return;

    let isMounted = true;
    setPollingQR(true);

    const pollQRAndStatus = async () => {
      if (!isMounted) return;
      
      try {
        // First check status
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
            setPollingQR(false);
            
            // Get session details
            const { data: sessionData } = await supabase
              .from('whatsapp_sessions')
              .select('*')
              .eq('id', sessionId)
              .single();
            
            if (sessionData) {
              onSuccess(sessionData);
            }
            return;
          }
        }
        
        // Then get QR code if not connected
        const { data: qrData, error: qrError } = await supabase.functions.invoke('whatsapp-api', {
          body: { action: 'get_qr_code', sessionId }
        });

        if (!qrError && qrData && isMounted) {
          console.log('[QR Modal] QR Data:', { hasQR: !!qrData.qrCode, isDemo: qrData.isDemo });
          if (qrData.qrCode) {
            setQrCode(qrData.qrCode);
          }
          if (qrData.isConnected) {
            setPhoneInfo({
              phoneNumber: qrData.phoneNumber,
              pushName: qrData.pushName
            });
            setStep('connected');
            setPollingQR(false);
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    };

    // Poll immediately and then every 2 seconds
    pollQRAndStatus();
    const interval = setInterval(pollQRAndStatus, 2000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
      setPollingQR(false);
    };
  }, [step, sessionId, onSuccess]);

  // Test Baileys server connection
  const testServerConnection = async () => {
    if (!baileysServerUrl.trim()) {
      toast({ title: 'Erro', description: 'Digite a URL do servidor', variant: 'destructive' });
      return;
    }

    setTestingServer(true);
    setServerStatus('unknown');

    try {
      // Clean URL
      let url = baileysServerUrl.trim();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      url = url.replace(/\/$/, ''); // Remove trailing slash

      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setServerStatus('online');
        setBaileysServerUrl(url);
        // Save URL to localStorage for future use
        localStorage.setItem('baileys_server_url', url);
        toast({ 
          title: '✅ Servidor Online', 
          description: `Baileys ${data.version || ''} - ${data.sessions || 0} sessões ativas` 
        });
      } else {
        setServerStatus('offline');
        toast({ title: 'Erro', description: 'Servidor não respondeu corretamente', variant: 'destructive' });
      }
    } catch (e) {
      setServerStatus('offline');
      toast({ title: 'Erro', description: 'Não foi possível conectar ao servidor', variant: 'destructive' });
    } finally {
      setTestingServer(false);
    }
  };

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
          userId,
          baileysServerUrl: baileysServerUrl || undefined
        }
      });

      if (error) throw error;

      setSessionId(data.session.id);
      
      // Get QR code
      const qrResponse = await supabase.functions.invoke('whatsapp-api', {
        body: { 
          action: 'get_qr_code', 
          sessionId: data.session.id 
        }
      });

      if (qrResponse.data) {
        setQrCode(qrResponse.data.qrCode);
      }
      
      setStep('qr');
      
      toast({
        title: baileysServerUrl ? 'Conectando...' : 'Modo Demo',
        description: baileysServerUrl 
          ? 'Aguardando QR Code do servidor Baileys' 
          : 'Configure um servidor Baileys para funcionalidade completa'
      });
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
        if (data.isDemo) {
          toast({ title: 'Modo Demo', description: 'Configure o servidor Baileys para QR real' });
        }
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
            {step === 'config' && 'Configure a conexão com seu servidor Baileys'}
            {step === 'qr' && 'Escaneie o QR Code com seu WhatsApp'}
            {step === 'connected' && 'WhatsApp conectado com sucesso!'}
          </DialogDescription>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-6">
            {/* Server Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Server className="h-4 w-4" />
                Servidor Baileys (Opcional)
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Para funcionalidade completa, você precisa de um servidor Node.js com Baileys.
                  <a 
                    href="https://github.com/WhiskeySockets/Baileys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary ml-1 inline-flex items-center gap-1"
                  >
                    Documentação <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Input
                  value={baileysServerUrl}
                  onChange={(e) => setBaileysServerUrl(e.target.value)}
                  placeholder="https://seu-servidor.railway.app"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={testServerConnection}
                  disabled={testingServer}
                >
                  {testingServer ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Testar'
                  )}
                </Button>
              </div>

              {serverStatus !== 'unknown' && (
                <div className={`flex items-center gap-2 text-sm ${
                  serverStatus === 'online' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <div className={`h-2 w-2 rounded-full ${
                    serverStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  {serverStatus === 'online' ? 'Servidor Online' : 'Servidor Offline'}
                </div>
              )}
            </div>

            {/* Instance Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Instância</label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Ex: vendas, suporte, marketing..."
                onKeyPress={(e) => e.key === 'Enter' && createInstance()}
              />
              <p className="text-xs text-muted-foreground">
                Use um nome único para identificar este WhatsApp
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={createInstance} disabled={loading || !instanceName.trim()}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {baileysServerUrl ? 'Conectar' : 'Iniciar Demo'}
              </Button>
            </div>
          </div>
        )}

        {step === 'qr' && (
          <div className="space-y-4">
            {!baileysServerUrl && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  <strong>Modo Demo:</strong> Configure um servidor Baileys para conectar de verdade.
                </AlertDescription>
              </Alert>
            )}

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
              <div className="bg-green-50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-green-800">
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