import React from 'react';
import { useLocation } from 'react-router-dom';
import CarouselGenerator from '@/components/Carousel/CarouselGenerator';
import Landing from '@/pages/Landing';
import { useAuth } from '@/hooks/useAuth';

const PublicCarouselGenerator: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // On root path, show landing page for unauthenticated visitors
  if (location.pathname === '/' && !loading && !user) {
    return <Landing />;
  }

  return <CarouselGenerator />;
};

export default PublicCarouselGenerator;
