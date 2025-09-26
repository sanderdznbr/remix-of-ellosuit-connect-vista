import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import AuthScreen from './AuthScreen';
import MobileAuthScreen from './Mobile/MobileAuthScreen';

const ResponsiveAuthScreen = () => {
  const { isMobile } = useIsMobile();

  if (isMobile) {
    return <MobileAuthScreen />;
  }

  return <AuthScreen />;
};

export default ResponsiveAuthScreen;