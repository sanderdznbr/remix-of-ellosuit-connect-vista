import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileHomeScreen from '@/components/Mobile/MobileHomeScreen';
import ExecutiveDashboard from './ExecutiveDashboard';

interface HomeProps {
  onNavigate: (item: string) => void;
}

const Home = ({ onNavigate }: HomeProps) => {
  const { isMobile } = useIsMobile();

  // Se for mobile, usar a versão mobile-first
  if (isMobile) {
    return <MobileHomeScreen onNavigate={onNavigate} />;
  }

  // Desktop: usar o Dashboard Executivo Inteligente
  return <ExecutiveDashboard onNavigate={onNavigate} />;
};

export default Home;
