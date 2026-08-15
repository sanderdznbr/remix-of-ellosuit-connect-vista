
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/components/AuthProvider";
import { SubscriptionBlockedBanner } from "@/components/SubscriptionBlockedBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import '@/styles/carousel-loader.css';
import { useAffiliateTracking } from "@/hooks/useAffiliateTracking";
import { Navigate } from "react-router-dom";
import { NativePurchaseGuard } from "@/components/NativePurchaseGuard";



// Lazy-loaded pages — each becomes a separate chunk
const PublicCarouselGenerator = lazy(() => import('./pages/PublicCarouselGenerator'));
const Index = lazy(() => import('./pages/Index'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Checkout = lazy(() => import('./pages/Checkout'));
const MarketplaceStyleDetail = lazy(() => import('./pages/MarketplaceStyleDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const PostPublic = lazy(() => import('./pages/PostPublic'));
const Presentear = lazy(() => import('./pages/Presentear'));
const Parceiros = lazy(() => import('./pages/Parceiros'));
const Admin = lazy(() => import('./pages/Admin'));
const AreaParceiros = lazy(() => import('./pages/AreaParceiros'));
const Comunidade = lazy(() => import('./pages/Comunidade'));
const Ajuda = lazy(() => import('./pages/Ajuda'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'));
const ChatCreator = lazy(() => import('./pages/ChatCreator'));
const Calendario = lazy(() => import('./pages/Calendario'));
const Hooks = lazy(() => import('./pages/Hooks'));
const Analytics = lazy(() => import('./pages/Analytics'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 10, // 10 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AffiliateTracker({ children }: { children: React.ReactNode }) {
  useAffiliateTracking();
  return <>{children}</>;
}

// Simple purple pulse loader
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
    <div className="flex gap-1.5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: '#8B5CF6',
            animation: `page-dot-pulse 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
    <style>{`@keyframes page-dot-pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }`}</style>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AffiliateTracker>
            <ScrollToTop />
            <AuthProvider>
              <SubscriptionBlockedBanner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<PublicCarouselGenerator />} />
                  <Route path="/projetos" element={<PublicCarouselGenerator />} />
                  <Route path="/favoritos" element={<PublicCarouselGenerator />} />
                  <Route path="/galeria" element={<PublicCarouselGenerator />} />
                  <Route path="/prompts" element={<PublicCarouselGenerator />} />
                  <Route path="/marketplace" element={<PublicCarouselGenerator />} />
                  <Route path="/ferramentas/remover-logo" element={<PublicCarouselGenerator />} />
                  <Route path="/ferramentas/historico" element={<PublicCarouselGenerator />} />
                  <Route path="/ferramentas/behance" element={<PublicCarouselGenerator />} />
                  <Route path="/ferramentas/instagram" element={<PublicCarouselGenerator />} />
                  <Route path="/ferramentas/gerador-rosto" element={<PublicCarouselGenerator />} />
                  <Route path="/ferramentas/criar-estilo" element={<PublicCarouselGenerator />} />
                  <Route path="/trends" element={<PublicCarouselGenerator />} />
                  <Route path="/carousel/:id" element={<PublicCarouselGenerator />} />
                  <Route path="/auth" element={<Index />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/gerador-de-carrosseis" element={<PublicCarouselGenerator />} />
                  <Route path="/precos" element={<NativePurchaseGuard><Pricing /></NativePurchaseGuard>} />
                  <Route path="/checkout" element={<NativePurchaseGuard><Checkout /></NativePurchaseGuard>} />
                  <Route path="/marketplace/:id" element={<NativePurchaseGuard><MarketplaceStyleDetail /></NativePurchaseGuard>} />
                  <Route path="/recursos" element={<Navigate to="/ajuda" replace />} />
                  <Route path="/suporte" element={<Navigate to="/ajuda" replace />} />
                  <Route path="/perfil" element={<Profile />} />
                  <Route path="/perfil/:username" element={<Profile />} />
                  <Route path="/configuracoes" element={<Settings />} />

                  <Route path="/post/:postId" element={<PostPublic />} />
                  <Route path="/presentear" element={<NativePurchaseGuard><Presentear /></NativePurchaseGuard>} />
                  <Route path="/parceiros" element={<Parceiros />} />
                  <Route path="/area/parceiros" element={<AreaParceiros />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/comunidade" element={<Comunidade />} />
                  <Route path="/ajuda" element={<Ajuda />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="/criar" element={<ChatCreator />} />
                  <Route path="/calendario" element={<Calendario />} />
                  <Route path="/hooks" element={<Hooks />} />
                  <Route path="/insights" element={<Analytics />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </AffiliateTracker>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
