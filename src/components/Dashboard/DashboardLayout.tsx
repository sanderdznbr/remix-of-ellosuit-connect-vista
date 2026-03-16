import React, { useState, useEffect, useCallback } from 'react';
import { ExpiringCreditsBanner } from '@/components/ExpiringCreditsBanner';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardSidebar from './DashboardSidebar';
import DashboardHome from './DashboardHome';
import DashboardProjects from './DashboardProjects';
import BrandGallery from './BrandGallery';
import PromptGallery from './PromptGallery';
import MarketplaceContent from '@/components/Marketplace/MarketplaceContent';
import FaceGenerator from './FaceGenerator';
import StyleCreator from './StyleCreator';
import LogoRemoverTool from './LogoRemoverTool';
import LogoRemoverHistory from './LogoRemoverHistory';
import BehanceImporter from './BehanceImporter';
import InstagramImporter from './InstagramImporter';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, X, User, ChevronDown, LogOut, Settings, CreditCard } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import ellocontentLogo from '@/assets/ellocontent2.svg';

interface DashboardLayoutProps {
  onStartCarousel?: (topic?: string, mentionedPrompts?: any[], postFormat?: string) => void;
  onLoadCarousel?: (carouselItem: any) => void;
  children?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onStartCarousel, onLoadCarousel, children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'home');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [behanceFiles, setBehanceFiles] = useState<File[] | undefined>(undefined);
  const { isMobile } = useIsMobile();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Handle ?tab= query param
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'U';
  const email = user?.email || '';

  // Fetch credit balance
  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      try {
        const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
        if (!cu) return;
        const { data } = await supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).maybeSingle();
        setCreditBalance(data?.balance ?? 0);
      } catch {}
    };
    fetchCredits();
  }, [user]);

  const handleTabChange = (tab: string) => {
    // If we're on a sub-page (children mode), navigate back to main dashboard
    if (children) {
      navigate(`/?tab=${tab}`);
      return;
    }
    setActiveTab(tab);
    setSearchQuery('');
    setSidebarOpen(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setActiveTab('projects');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderContent = () => {
    if (children) return <div className="flex-1 min-w-0 min-h-0 overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>{children}</div>;
    const content = (() => {
      switch (activeTab) {
        case 'projects':
          return <DashboardProjects onStartCarousel={onStartCarousel || (() => {})} onLoadCarousel={onLoadCarousel} filterMode="all" searchQuery={searchQuery} />;
        case 'starred':
          return <DashboardProjects onStartCarousel={onStartCarousel || (() => {})} onLoadCarousel={onLoadCarousel} filterMode="starred" searchQuery={searchQuery} />;
        case 'gallery':
          return <BrandGallery />;
        case 'prompts':
          return <PromptGallery />;
        case 'marketplace':
          return <MarketplaceContent />;
        case 'face-generator':
          return <FaceGenerator />;
        case 'style-creator':
          return <StyleCreator />;
        case 'logo-remover':
          return <LogoRemoverTool initialFiles={behanceFiles} onInitialFilesConsumed={() => setBehanceFiles(undefined)} />;
        case 'logo-history':
          return <LogoRemoverHistory />;
        case 'behance-import':
          return <BehanceImporter onSendToLogoRemover={(files) => {
            setBehanceFiles(files);
            setActiveTab('logo-remover');
          }} />;
        case 'instagram-import':
          return <InstagramImporter onSendToLogoRemover={(files) => {
            setBehanceFiles(files);
            setActiveTab('logo-remover');
          }} />;
        default:
          return <DashboardHome onStartCarousel={onStartCarousel || (() => {})} onLoadCarousel={onLoadCarousel} onViewAllProjects={() => handleTabChange('projects')} />;
      }
    })();
    const isHome = activeTab === 'home';
    return (
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
        <ExpiringCreditsBanner />
        <div
          className="flex-1 min-h-0 overflow-y-auto flex flex-col"
          style={{
            WebkitOverflowScrolling: 'touch' as any,
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            ...(isMobile && !isHome ? { paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' } : {}),
          }}
        >
          {content}
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] w-full" style={{ backgroundColor: '#0a0a0f', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Mobile Header — transparent, floats above content */}
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 h-14 z-50 bg-transparent" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {/* Left: hamburger to open sidebar */}
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-white/60 cursor-pointer">
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className="block w-full h-[1.5px] bg-white/60 rounded-full" />
              <span className="block w-3.5 h-[1.5px] bg-white/60 rounded-full" />
              <span className="block w-full h-[1.5px] bg-white/60 rounded-full" />
            </div>
          </button>

          {/* Center: logo */}
          <img src={ellocontentLogo} alt="elloContent" className="h-7 cursor-pointer" onClick={() => { setActiveTab('home'); }} />

          {/* Right: profile avatar */}
          <button onClick={() => setProfileOpen(!profileOpen)} className="relative cursor-pointer p-1.5 text-white/60">
            <User className="w-5 h-5" />
          </button>
        </header>

        {/* Profile dropdown (mobile) */}
        {profileOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
            <div className="absolute top-14 right-3 w-64 rounded-xl border border-white/[0.08] shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: '#111116' }}>
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm text-white/70 font-medium truncate">{email}</p>
              </div>
              <div className="py-1">
                <div className="px-4 py-3 border-b border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors" onClick={() => { setProfileOpen(false); navigate('/precos'); }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Créditos</span>
                    <span className="text-white/70 font-medium">{creditBalance !== null ? `${Math.floor(creditBalance)} restantes` : '...'}</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/[0.06] mt-1.5">
                    <div className="h-full rounded-full bg-purple-500/60" style={{ width: `${Math.min(100, ((creditBalance ?? 0) / 100) * 100)}%` }} />
                  </div>
                </div>
                <button onClick={() => { setProfileOpen(false); navigate('/perfil'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                  <User className="w-4 h-4" /> Perfil
                </button>
                <button onClick={() => { setProfileOpen(false); navigate('/configuracoes'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                  <Settings className="w-4 h-4" /> Configurações
                </button>
                <button onClick={() => { setProfileOpen(false); navigate('/precos'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                  <CreditCard className="w-4 h-4" /> Plano & Créditos
                </button>
              </div>
              <div className="border-t border-white/[0.06] py-1">
                <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400/60 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>
          </>
        )}

        {/* Sidebar drawer overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-[280px] h-full animate-in slide-in-from-left duration-200">
              <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} onSearch={handleSearch} onLoadCarousel={onLoadCarousel} />
              <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 p-1 text-white/40 hover:text-white cursor-pointer z-10">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#0a0a0f' }}>
      <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} onSearch={handleSearch} onLoadCarousel={onLoadCarousel} />
      {renderContent()}
    </div>
  );
};

export default DashboardLayout;
