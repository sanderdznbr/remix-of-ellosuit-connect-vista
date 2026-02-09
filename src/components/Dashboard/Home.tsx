import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileHomeDashboard from '@/components/Mobile/MobileHomeDashboard';
import AIAssistantHome from './AIAssistantHome';

interface HomeProps {
  onNavigate: (item: string) => void;
}

const Home = ({ onNavigate }: HomeProps) => {
  const { isMobile } = useIsMobile();

  if (isMobile) {
    return <MobileHomeDashboard onNavigate={onNavigate} />;
  }

  return <AIAssistantHome />;
};

export default Home;
