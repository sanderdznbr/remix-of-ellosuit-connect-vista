
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import BookingPage from "./pages/BookingPage";
import Team from "./pages/Team";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Tarefas from "./pages/Tarefas";
import BookingPublic from "./pages/BookingPublic";
import MeetingRoom from "./components/Dashboard/MeetingRoom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/meeting/:roomCode" element={<MeetingRoom />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/tasks" element={<Tarefas />} />
            <Route path="/booking-public/:slug" element={<BookingPublic />} />
            <Route path="/team" element={<Team />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
