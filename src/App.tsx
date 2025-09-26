
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import BookingPage from "./pages/BookingPage";
import Team from "./pages/Team";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Tarefas from "./pages/Tarefas";
import BookingPublic from '@/pages/BookingPublic';
import ImprovedBookingPublic from '@/pages/ImprovedBookingPublic';
import ImprovedBookingCalendar from '@/pages/ImprovedBookingCalendar';
import MeetingRoom from "./components/Dashboard/MeetingRoom";
import LiveKitMeeting from "./pages/LiveKitMeeting";
import DocumentViewer from './pages/DocumentViewer';
import SharedContent from './pages/SharedContent';

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
            <Route path="/auth" element={<AuthScreen />} />
            <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/meeting/:roomCode" element={<MeetingRoom />} />
            <Route path="/livekit/:roomCode" element={<LiveKitMeeting />} />
            <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
            <Route path="/booking-public/:slug" element={<ImprovedBookingPublic />} />
            <Route path="/agendamentos/:slug" element={<ImprovedBookingCalendar />} />
            <Route path="/:companyName/:slug" element={<ImprovedBookingCalendar />} />
            <Route path="/document/:linkId" element={<DocumentViewer />} />
            <Route path="/shared/:shareId" element={<SharedContent />} />
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
