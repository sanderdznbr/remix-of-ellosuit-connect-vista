import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hasSeenTour: boolean;
  preferences: {
    segment?: string;
    companySize?: string;
    mainGoals?: string[];
    recommendedTools?: string[];
  } | null;
}

export const useOnboarding = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    hasCompletedOnboarding: true, // Default true to prevent flash
    hasSeenTour: true,
    preferences: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check localStorage first for quick response
        const localOnboarding = localStorage.getItem(`onboarding_${user.id}`);
        const localTour = localStorage.getItem(`tour_${user.id}`);
        
        if (localOnboarding) {
          const parsed = JSON.parse(localOnboarding);
          setState({
            hasCompletedOnboarding: true,
            hasSeenTour: localTour === 'completed',
            preferences: parsed,
          });
        } else {
          // Check if user was created recently (within last hour) - new user
          const createdAt = new Date(user.created_at || '');
          const now = new Date();
          const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          
          const isNewUser = createdAt > hourAgo;
          
          setState({
            hasCompletedOnboarding: !isNewUser,
            hasSeenTour: !isNewUser,
            preferences: null,
          });
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const completeOnboarding = async (preferences: OnboardingState['preferences']) => {
    if (!user) return;

    try {
      // Save to localStorage
      localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(preferences));
      
      setState(prev => ({
        ...prev,
        hasCompletedOnboarding: true,
        preferences,
      }));

      // Also try to save to sidebar settings
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (companyUser && preferences?.recommendedTools) {
        // Update sidebar settings with recommended tools order
        const { data: existingSettings } = await supabase
          .from('user_sidebar_settings')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_id', companyUser.company_id)
          .single();

        if (!existingSettings) {
          await supabase
            .from('user_sidebar_settings')
            .insert({
              user_id: user.id,
              company_id: companyUser.company_id,
              menu_order: preferences.recommendedTools,
            });
        }
      }
    } catch (error) {
      console.error('Error saving onboarding preferences:', error);
    }
  };

  const completeTour = () => {
    if (!user) return;
    
    localStorage.setItem(`tour_${user.id}`, 'completed');
    setState(prev => ({ ...prev, hasSeenTour: true }));
  };

  const skipOnboarding = () => {
    if (!user) return;
    
    localStorage.setItem(`onboarding_${user.id}`, JSON.stringify({ skipped: true }));
    setState(prev => ({ 
      ...prev, 
      hasCompletedOnboarding: true,
      hasSeenTour: true 
    }));
  };

  const resetOnboarding = () => {
    if (!user) return;
    
    localStorage.removeItem(`onboarding_${user.id}`);
    localStorage.removeItem(`tour_${user.id}`);
    setState({
      hasCompletedOnboarding: false,
      hasSeenTour: false,
      preferences: null,
    });
  };

  return {
    ...state,
    loading,
    completeOnboarding,
    completeTour,
    skipOnboarding,
    resetOnboarding,
  };
};

export default useOnboarding;
