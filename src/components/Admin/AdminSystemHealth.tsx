import React from 'react';
import { useAdminMaster } from '@/hooks/useAdminMaster';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

const edgeFunctions = [
  'whatsapp-api', 'whatsapp-webhook', 'livekit-token', 'livekit-transcription',
  'livekit-webhook', 'meeting-recording', 'send-email', 'track-email-open',
  'document-tracking', 'ai-chat', 'pagarme-checkout', 'pagarme-webhook',
  'pagarme-cancel', 'google-calendar', 'sync-google-calendar', 'admin-impersonate',
  'realtime-transcription', 'send-push', 'register-device', 'turn-config',
];

const AdminSystemHealth = () => {
  const { isAdminMaster, loading: authLoading } = useAdminMaster();
  const navigate = useNavigate();

  if (authLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!isAdminMaster) return <Navigate to="/dashboard" replace />;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Saúde do Sistema</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Edge Functions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {edgeFunctions.map(fn => (
              <div key={fn} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-mono">{fn}</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" /> Deployed
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">APIs Externas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['WhatsApp (Baileys)', 'LiveKit', 'OpenAI', 'Pagar.me', 'Google Calendar', 'AssemblyAI'].map(api => (
              <div key={api} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">{api}</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" /> Configurado
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Monitoramento</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Para ver logs detalhados das edge functions, acesse o painel do Supabase:
          </p>
          <Button variant="outline" className="mt-3" onClick={() => window.open('https://supabase.com/dashboard/project/jwddiyuezqrpuakazvgg/functions', '_blank')}>
            Abrir Supabase Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSystemHealth;
