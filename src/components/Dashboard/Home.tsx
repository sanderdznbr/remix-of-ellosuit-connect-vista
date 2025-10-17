import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileHomeScreen from '@/components/Mobile/MobileHomeScreen';
import AIAssistantHome from './AIAssistantHome';

interface HomeProps {
  onNavigate: (item: string) => void;
}

const Home = ({ onNavigate }: HomeProps) => {
  const { isMobile } = useIsMobile();

  // Se for mobile, usar a versão mobile-first
  if (isMobile) {
    return <MobileHomeScreen onNavigate={onNavigate} />;
  }

  // Desktop: usar o novo assistente AI
  return <AIAssistantHome />;
};

export default Home;
