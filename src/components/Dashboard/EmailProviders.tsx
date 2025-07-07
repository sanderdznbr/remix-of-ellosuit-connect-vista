
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Plus, 
  CheckCircle, 
  Settings, 
  Trash2,
  Calendar,
  Loader2
} from 'lucide-react';

const EmailProviders = () => {
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadConnectedAccounts();
      checkForNewConnection();
    }
  }, [user]);

  const loadConnectedAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_email_accounts')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setConnectedAccounts(data || []);
    } catch (error) {
      console.error('Error loading connected accounts:', error);
    }
  };

  const checkForNewConnection = async () => {
    // Check if user just connected via OAuth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Check if this is a new OAuth connection
      const lastSignInVia = session.user.app_metadata?.provider;
      
      if (lastSignInVia === 'google') {
        // Save the connected account info
        await saveConnectedAccount('gmail', session.user.email);
        
        toast({
          title: "Gmail conectado com sucesso!",
          description: `Conta ${session.user.email} foi conectada.`,
        });
      }
    }
  };

  const saveConnectedAccount = async (provider: string, email: string) => {
    try {
      // Get user's company_id
      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!companyData?.company_id) {
        console.error('No company found for user');
        return;
      }

      const { error } = await supabase
        .from('user_email_accounts')
        .upsert({
          user_id: user?.id,
          company_id: companyData.company_id,
          provider: provider as 'gmail' | 'outlook' | 'yahoo',
          email: email,
          connected_at: new Date().toISOString(),
          status: 'active'
        });

      if (error) throw error;
      await loadConnectedAccounts();
    } catch (error) {
      console.error('Error saving connected account:', error);
    }
  };

  const connectGmail = async () => {
    setIsConnecting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'email profile https://www.googleapis.com/auth/gmail.send',
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;
    } catch (error) {
      toast({
        title: "Erro ao conectar Gmail",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('user_email_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      
      await loadConnectedAccounts();
      toast({
        title: "Conta desconectada",
        description: "A conta foi removida com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao desconectar",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Provedores de Email</h2>
        <p className="text-gray-600">Conecte suas contas de email para enviar campanhas</p>
      </div>

      {/* Connected Accounts */}
      {connectedAccounts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contas Conectadas</h3>
          {connectedAccounts.map((account) => (
            <Card key={account.id} className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{account.email}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>Conectado em {new Date(account.connected_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => disconnectAccount(account.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Available Providers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Gmail */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Gmail</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Conecte sua conta Gmail para enviar emails diretamente
            </p>
            <Button 
              onClick={connectGmail}
              disabled={isConnecting}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isConnecting ? 'Conectando...' : 'Conectar Gmail'}
            </Button>
          </CardContent>
        </Card>

        {/* Outlook - Coming Soon */}
        <Card className="opacity-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Outlook</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Conecte sua conta Outlook/Hotmail
            </p>
            <Button disabled className="w-full">
              Em breve
            </Button>
          </CardContent>
        </Card>

        {/* Yahoo - Coming Soon */}
        <Card className="opacity-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Yahoo</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Conecte sua conta Yahoo Mail
            </p>
            <Button disabled className="w-full">
              Em breve
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailProviders;
