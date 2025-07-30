
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SidebarSettings {
  id?: string;
  sidebar_color: string;
  sidebar_background_color?: string;
  custom_logo_url?: string;
  custom_favicon_url?: string;
  menu_order: string[];
}

export const useSidebarSettings = () => {
  const [settings, setSettings] = useState<SidebarSettings>({
    sidebar_color: '#3000E3',
    sidebar_background_color: '#3600FF',
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
        // Safely handle the menu_order conversion
        let menuOrder: string[] = [];
        if (data.menu_order && Array.isArray(data.menu_order)) {
          menuOrder = data.menu_order.map((item: any) => String(item));
        }

        const newSettings = {
          id: data.id,
          sidebar_color: data.sidebar_color || '#3000E3',
          sidebar_background_color: data.sidebar_background_color || '#3600FF',
          custom_logo_url: data.custom_logo_url,
          custom_favicon_url: data.custom_favicon_url,
          menu_order: menuOrder
        };

        setSettings(newSettings);
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
            sidebar_background_color: updatedSettings.sidebar_background_color,
            custom_logo_url: updatedSettings.custom_logo_url,
            custom_favicon_url: updatedSettings.custom_favicon_url,
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
            sidebar_background_color: updatedSettings.sidebar_background_color,
            custom_logo_url: updatedSettings.custom_logo_url,
            custom_favicon_url: updatedSettings.custom_favicon_url,
            menu_order: updatedSettings.menu_order
          })
          .select()
          .single();

        if (error) throw error;
        updatedSettings.id = data.id;
      }

      // Atualiza o estado imediatamente para reflexão instantânea
      setSettings(updatedSettings);
      
      // Disparar evento customizado para atualizar outras partes da aplicação
      window.dispatchEvent(new CustomEvent('sidebarSettingsUpdated', { 
        detail: updatedSettings 
      }));
      
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

  // Função para determinar se uma cor é escura
  const isColorDark = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness < 128;
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
    refetch: fetchSettings,
    isColorDark
  };
};
