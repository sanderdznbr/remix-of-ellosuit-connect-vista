import React, { lazy, Suspense } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const CarouselGenerator = lazy(() => import('@/components/Carousel/CarouselGenerator'));
const Landing = lazy(() => import('@/pages/Landing'));

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]" role="status" aria-label="Carregando ellocontent">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
  </div>
);

const PublicCarouselGenerator: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoader />;
  }

  // On root path, show landing page for unauthenticated visitors
  if (location.pathname === '/' && !user) {
    return <Suspense fallback={<RouteLoader />}><Landing /></Suspense>;
  }

  // Require account before entering the generator (no free anonymous posts)
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?mode=register&next=${next}`} replace />;
  }

  return <Suspense fallback={<RouteLoader />}><CarouselGenerator /></Suspense>;
};

export default PublicCarouselGenerator;
