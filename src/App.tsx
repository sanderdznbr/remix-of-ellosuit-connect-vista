
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/components/AuthProvider";
import { SubscriptionBlockedBanner } from "@/components/SubscriptionBlockedBanner";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import PublicCarouselGenerator from './pages/PublicCarouselGenerator';
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';
import MarketplaceStyleDetail from './pages/MarketplaceStyleDetail';
import Recursos from './pages/Recursos';
import Suporte from './pages/Suporte';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PostPublic from './pages/PostPublic';
import Presentear from './pages/Presentear';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <SubscriptionBlockedBanner />
          <Routes>
            <Route path="/" element={<PublicCarouselGenerator />} />
            <Route path="/carousel/:id" element={<PublicCarouselGenerator />} />
            <Route path="/auth" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/gerador-de-carrosseis" element={<PublicCarouselGenerator />} />
            <Route path="/precos" element={<Pricing />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/marketplace/:id" element={<MarketplaceStyleDetail />} />
            <Route path="/recursos" element={<Recursos />} />
            <Route path="/suporte" element={<Suporte />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/perfil/:username" element={<Profile />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/post/:postId" element={<PostPublic />} />
            <Route path="/presentear" element={<Presentear />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
