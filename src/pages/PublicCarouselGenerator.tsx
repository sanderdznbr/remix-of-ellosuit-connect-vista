import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
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

  // Require account before entering the generator (no free anonymous posts)
  if (!loading && !user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?mode=register&next=${next}`} replace />;
  }

  return <CarouselGenerator />;
};

export default PublicCarouselGenerator;
