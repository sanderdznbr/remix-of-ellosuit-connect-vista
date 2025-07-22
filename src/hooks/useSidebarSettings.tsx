
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SidebarSettings {
  id?: string;
  sidebar_color: string;
  custom_logo_url?: string;
  menu_order: string[];
}

export const useSidebarSettings = () => {
  const [settings, setSettings] = useState<SidebarSettings>({
    sidebar_color: '#3600FF',
    menu_order: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!user) return;

    try {
      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) return;

      const { data, error } = await supabase
        .from('user_sidebar_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyUser.company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          id: data.id,
          sidebar_color: data.sidebar_color || '#3600FF',
          custom_logo_url: data.custom_logo_url,
          menu_order: data.menu_order || []
        });
      }
    } catch (error) {
      console.error('Error fetching sidebar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SidebarSettings>) => {
    if (!user) return;

    try {
      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error('Usuário não associado a empresa');

      const updatedSettings = { ...settings, ...newSettings };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('user_sidebar_settings')
          .update({
            sidebar_color: updatedSettings.sidebar_color,
            custom_logo_url: updatedSettings.custom_logo_url,
            menu_order: updatedSettings.menu_order
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('user_sidebar_settings')
          .insert({
            user_id: user.id,
            company_id: companyUser.company_id,
            sidebar_color: updatedSettings.sidebar_color,
            custom_logo_url: updatedSettings.custom_logo_url,
            menu_order: updatedSettings.menu_order
          })
          .select()
          .single();

        if (error) throw error;
        updatedSettings.id = data.id;
      }

      setSettings(updatedSettings);
      
      toast({
        title: "Sucesso",
        description: "Configurações da sidebar atualizadas"
      });
    } catch (error) {
      console.error('Error updating sidebar settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings
  };
};
