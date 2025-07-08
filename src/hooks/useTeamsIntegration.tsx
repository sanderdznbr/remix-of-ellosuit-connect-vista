
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useTeamsIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const checkConnection = async () => {
    if (!user) return;

    try {
      console.log('🔍 Verificando conexão Teams para usuário:', user.id);
      
      const { data, error } = await supabase
        .from('meeting_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'teams')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar integração Teams:', error);
        return;
      }

      if (data) {
        console.log('✅ Integração Teams encontrada:', data.id);
        setIntegration(data);
        setIsConnected(true);
      } else {
        console.log('⚠️ Nenhuma integração Teams encontrada');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('💥 Erro ao verificar conexão Teams:', error);
    }
  };

  const connectTeams = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔗 Iniciando conexão com Teams...');
      
      const { data, error } = await supabase.functions.invoke('teams-integration', {
        body: { action: 'get_auth_url', userId: user.id }
      });

      if (error) {
        throw error;
      }

      if (data?.authUrl) {
        console.log('🔗 Redirecionando para Teams OAuth...');
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('💥 Erro ao conectar Teams:', error);
      toast({
        title: "Erro",
        description: `Erro ao conectar com Teams: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getValidAccessToken = async () => {
    if (!integration) {
      throw new Error('Teams not connected');
    }

    // Verificar se o token expirou
    const now = new Date();
    const expiresAt = new Date(integration.expires_at);
    
    if (now >= expiresAt) {
      console.log('🔄 Token Teams expirado, renovando...');
      return await renewToken();
    }

    return integration.access_token;
  };

  const renewToken = async () => {
    if (!integration?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('🔄 Renovando token Teams...');
      
      const { data, error } = await supabase.functions.invoke('teams-integration', {
        body: {
          action: 'renew_token',
          refreshToken: integration.refresh_token,
          userId: user?.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        console.log('✅ Token Teams renovado com sucesso');
        await checkConnection();
        return data.access_token;
      }

      throw new Error('Failed to renew Teams token');
    } catch (error) {
      console.error('💥 Erro ao renovar token Teams:', error);
      throw error;
    }
  };

  const disconnectTeams = async () => {
    if (!user || !integration) return;

    setLoading(true);
    
    try {
      console.log('🔌 Desconectando Teams...');
      
      const { error } = await supabase
        .from('meeting_integrations')
        .delete()
        .eq('id', integration.id);

      if (error) {
        throw error;
      }

      setIsConnected(false);
      setIntegration(null);
      
      console.log('✅ Teams desconectado');
      toast({
        title: "Sucesso",
        description: "Teams desconectado com sucesso"
      });
    } catch (error) {
      console.error('💥 Erro ao desconectar Teams:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar Teams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkConnection();
    }
  }, [user]);

  return {
    isConnected,
    loading,
    integration,
    connectTeams,
    disconnectTeams,
    checkConnection,
    getValidAccessToken
  };
};
