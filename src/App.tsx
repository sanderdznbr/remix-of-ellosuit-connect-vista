
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/components/AuthProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import PublicCarouselGenerator from './pages/PublicCarouselGenerator';
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';
import Marketplace from './pages/Marketplace';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PublicCarouselGenerator />} />
            <Route path="/carousel/:id" element={<PublicCarouselGenerator />} />
            <Route path="/auth" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/gerador-de-carrosseis" element={<PublicCarouselGenerator />} />
            <Route path="/precos" element={<Pricing />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
