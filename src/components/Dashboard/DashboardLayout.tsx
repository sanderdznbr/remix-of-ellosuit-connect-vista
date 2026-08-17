import React, { lazy, Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpiringCreditsBanner } from '@/components/ExpiringCreditsBanner';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import type { TrendData } from './TrendsPanel';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, User, LogOut, Settings, CreditCard, Home, LayoutGrid, MessageCircle, Users, History } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { tabFromPath, routeFromTab } from '@/utils/dashboard-routes';
import ellocontentLogo from '@/assets/ellocontent2.svg';
import { isNativeIOS } from '@/lib/platform';

const DashboardHome = lazy(() => import('./DashboardHome'));
const DashboardProjects = lazy(() => import('./DashboardProjects'));
const BrandGallery = lazy(() => import('./BrandGallery'));
const PromptGallery = lazy(() => import('./PromptGallery'));
const MarketplaceContent = lazy(() => import('@/components/Marketplace/MarketplaceContent'));
const FaceGenerator = lazy(() => import('./FaceGenerator'));
const StyleCreator = lazy(() => import('./StyleCreator'));
const LogoRemoverTool = lazy(() => import('./LogoRemoverTool'));
const LogoRemoverHistory = lazy(() => import('./LogoRemoverHistory'));
const BehanceImporter = lazy(() => import('./BehanceImporter'));
const InstagramImporter = lazy(() => import('./InstagramImporter'));
const TrendsPanel = lazy(() => import('./TrendsPanel'));

const DashboardPanelLoader = () => (
  <div className="flex min-h-48 flex-1 items-center justify-center" role="status" aria-label="Carregando conteúdo">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
  </div>
);

interface DashboardLayoutProps {
  onStartCarousel?: (topic?: string, mentionedPrompts?: any[], postFormat?: string, trendData?: TrendData) => void;
  onLoadCarousel?: (carouselItem: any) => void;
  onResumeJob?: (jobId: string) => void;
  children?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onStartCarousel, onLoadCarousel, onResumeJob, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabFromPath(location.pathname);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [monthlyCredits, setMonthlyCredits] = useState<number>(0);
  const [planName, setPlanName] = useState<string>('free');
  const [behanceFiles, setBehanceFiles] = useState<File[] | undefined>(undefined);
  const { isMobile } = useIsMobile();
  const { user, signOut } = useAuth();

  const email = user?.email || '';

  // Fetch credit balance
  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      try {
        const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
        if (!cu) return;
        const [{ data }, { data: elloSub }] = await Promise.all([
          supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).maybeSingle(),
          supabase.from('ellocontent_subscriptions').select('plan_name, monthly_credits, status').eq('company_id', cu.company_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        setCreditBalance(data?.balance ?? 0);
        if (elloSub && (elloSub.status === 'active' || elloSub.status === 'trialing')) {
          setMonthlyCredits(elloSub.monthly_credits || 0);
          setPlanName(elloSub.plan_name || 'free');
        }
      } catch {}
    };
    fetchCredits();
  }, [user]);

  const handleTabChange = (tab: string) => {
    const route = routeFromTab(tab);
    navigate(route);
    setSearchQuery('');
    setSidebarOpen(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query && activeTab !== 'projects') {
      navigate(routeFromTab('projects'));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderContent = () => {
    if (children) return (
      <div
        className="flex-1 min-w-0 min-h-0 overflow-y-auto"
        style={{
          backgroundColor: '#0a0a0f',
          ...(isMobile ? { paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))' } : {}),
        }}
      >
        {children}
      </div>
    );
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
            navigate(routeFromTab('logo-remover'));
          }} />;
        case 'instagram-import':
          return <InstagramImporter onSendToLogoRemover={(files) => {
            setBehanceFiles(files);
            navigate(routeFromTab('logo-remover'));
          }} />;
        case 'trends':
          return <TrendsPanel onCreateFromTrend={(topic, trendData) => onStartCarousel?.(topic, undefined, undefined, trendData)} />;
        default:
          return <DashboardHome onStartCarousel={onStartCarousel || (() => {})} onLoadCarousel={onLoadCarousel} onViewAllProjects={() => handleTabChange('projects')} onResumeJob={onResumeJob} />;
      }
    })();
    const isHome = activeTab === 'home';
    return (
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative" style={{ backgroundColor: '#0a0a0f' }}>
        {!isHome && (
          <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #0a0813 0%, #050509 55%, #030305 100%)' }} />
            <div className="absolute" style={{ top: '15%', left: '50%', transform: 'translateX(-50%)', width: '70%', height: '55%', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(88,28,135,0.08) 40%, transparent 70%)', filter: 'blur(60px)' }} />
            <div className="absolute" style={{ top: '55%', left: '10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)', filter: 'blur(80px)' }} />
            <div className="absolute" style={{ top: '10%', right: '5%', width: '35%', height: '35%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
          </div>
        )}
        <div
          className={`flex-1 min-h-0 flex flex-col relative z-10 ${isHome ? 'overflow-hidden' : 'overflow-y-auto'}`}
          style={{
            WebkitOverflowScrolling: 'touch' as any,
            overscrollBehavior: 'contain',
            touchAction: isHome ? 'manipulation' : 'pan-y',
            ...(isMobile ? {
              boxSizing: 'border-box',
              paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
              paddingBottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))',
            } : {}),
          }}
        >
          <ExpiringCreditsBanner />
          <Suspense fallback={<DashboardPanelLoader />}>
            {content}
          </Suspense>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="flex flex-col w-full overflow-hidden" style={{ backgroundColor: '#0a0a0f', height: '100dvh', minHeight: 0 }}>
        {/* Mobile Header — transparent, floats above content */}
        <header className="absolute left-0 right-0 flex items-center justify-between px-4 h-14 z-50 bg-transparent" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
          <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menu" aria-expanded={sidebarOpen} className="p-1.5 text-white/60 cursor-pointer">
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className="block w-full h-[1.5px] bg-white/60 rounded-full" />
              <span className="block w-3.5 h-[1.5px] bg-white/60 rounded-full" />
              <span className="block w-full h-[1.5px] bg-white/60 rounded-full" />
            </div>
          </button>
          <img src={ellocontentLogo} alt="elloContent" className="h-7 cursor-pointer" onClick={() => navigate('/')} />
          <button onClick={() => setProfileOpen(!profileOpen)} aria-label={profileOpen ? 'Fechar perfil' : 'Abrir perfil'} aria-expanded={profileOpen} className="relative cursor-pointer p-1.5 text-white/60 transition-transform duration-200">
            {profileOpen ? <X className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </button>
        </header>

        {/* Profile dropdown (mobile) */}
        <AnimatePresence>
          {profileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40"
                style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.4)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setProfileOpen(false)}
              />
              <motion.div
                className="fixed top-0 right-0 bottom-0 w-[86%] max-w-[380px] border-l border-white/[0.08] shadow-2xl z-50 overflow-y-auto"
                style={{ backgroundColor: '#111116', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))' }}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-sm text-white/70 font-medium truncate">{email}</p>
                  <button onClick={() => setProfileOpen(false)} aria-label="Fechar perfil" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="py-1">
                  {!isNativeIOS() && (() => {
                    const balance = creditBalance ?? 0;
                    const planNameLower = planName.toLowerCase();
                    const planLabel = planNameLower.includes('growth') ? 'Growth' : planNameLower.includes('pro') ? 'Pro' : planNameLower.includes('starter') ? 'Starter' : 'Free';
                    const planColor = '#8B5CF6';
                    const maxBar = Math.max(balance, monthlyCredits, 50);
                    const balancePct = Math.min(100, (balance / maxBar) * 100);
                    const monthlyMarkerPct = monthlyCredits > 0 ? Math.min(100, (monthlyCredits / maxBar) * 100) : 0;
                    const bonusCredits = monthlyCredits > 0 ? Math.max(0, balance - monthlyCredits) : 0;

                    return (
                      <div
                        className={`px-4 py-3 border-b border-white/[0.06] transition-colors ${isNativeIOS() ? '' : 'cursor-pointer hover:bg-white/[0.04]'}`}
                        onClick={() => {
                          if (isNativeIOS()) return;
                          setProfileOpen(false);
                          navigate('/precos');
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${planColor}20`, color: planColor }}>
                              {planLabel}
                            </span>
                          </div>
                          <span className="text-white/70 text-xs font-medium">{Math.floor(balance)} restantes</span>
                        </div>
                        <div className="relative w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden" style={{ width: `${balancePct}%`, background: `linear-gradient(90deg, #7C3AED, #8B5CF6, #A78BFA)` }}>
                            <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer-credit 2s ease-in-out infinite' }} />
                          </div>
                          {monthlyMarkerPct > 0 && monthlyMarkerPct < 100 && (
                            <div className="absolute top-[-3px] bottom-[-3px] w-[2px] rounded-full" style={{ left: `${monthlyMarkerPct}%`, backgroundColor: 'rgba(255,255,255,0.5)' }} />
                          )}
                          <style>{`@keyframes shimmer-credit { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
                        </div>
                        {monthlyCredits > 0 && (
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-white/25">{monthlyCredits} mensais</span>
                            {bonusCredits > 0 && (
                              <span className="text-[10px]" style={{ color: `${planColor}99` }}>+{Math.floor(bonusCredits)} bônus</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <button onClick={() => { setProfileOpen(false); navigate('/perfil'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <User className="w-4 h-4" /> Perfil
                  </button>
                  <button onClick={() => { setProfileOpen(false); navigate('/comunidade'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <Users className="w-4 h-4" /> Comunidade
                  </button>
                  {!isNativeIOS() && (
                    <button onClick={() => { setProfileOpen(false); navigate('/precos'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                      <CreditCard className="w-4 h-4" /> Assinatura
                    </button>
                  )}
                  <button onClick={() => { setProfileOpen(false); navigate('/projetos'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <History className="w-4 h-4" /> Histórico
                  </button>
                  <button onClick={() => { setProfileOpen(false); navigate('/configuracoes'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <Settings className="w-4 h-4" /> Configurações
                  </button>
                  <button onClick={() => { setProfileOpen(false); navigate('/ajuda'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <MessageCircle className="w-4 h-4" /> Ajuda
                  </button>
                </div>
                <div className="border-t border-white/[0.06] py-1">
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400/60 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sidebar drawer overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-[260px] h-full animate-in slide-in-from-left duration-200 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' as any, overscrollBehavior: 'contain' }}>
              <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} onSearch={handleSearch} onLoadCarousel={onLoadCarousel} />
              <button onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" className="absolute top-4 right-3 p-1.5 text-white/40 hover:text-white cursor-pointer z-10">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {renderContent()}

        {/* Bottom nav (mobile) */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t backdrop-blur-xl"
          style={{
            backgroundColor: 'rgba(9,9,13,0.92)',
            borderColor: 'rgba(255,255,255,0.06)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {[
            { key: 'home', label: 'Início', icon: Home, onClick: () => handleTabChange('home'), active: activeTab === 'home' && location.pathname !== '/criar' },
            { key: 'criar', label: 'Chat IA', icon: MessageCircle, onClick: () => navigate('/criar'), active: location.pathname === '/criar' },
            { key: 'projects', label: 'Posts', icon: LayoutGrid, onClick: () => handleTabChange('projects'), active: activeTab === 'projects' || activeTab === 'starred' },
            { key: 'settings', label: 'Configurações', icon: Settings, onClick: () => setProfileOpen(v => !v), active: profileOpen },
          ].map(item => (
            <button
              key={item.key}
              onClick={item.onClick}
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 cursor-pointer transition-colors"
              style={{ color: item.active ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }


  return (
    <div className="flex w-full relative overflow-hidden" style={{ backgroundColor: '#0a0a0f', height: '100dvh', minHeight: 0 }}>
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSearch={handleSearch}
        onLoadCarousel={onLoadCarousel}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => {
          const next = !sidebarCollapsed;
          setSidebarCollapsed(next);
          try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
        }}
      />
      {renderContent()}
    </div>
  );

};

export default DashboardLayout;
