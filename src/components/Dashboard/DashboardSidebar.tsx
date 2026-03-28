import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, FolderOpen, Star, Settings, LogOut, ChevronDown, ChevronRight, User, CreditCard, X, ImageIcon, ShoppingBag, MessageSquareText, Camera, Brush, Shield, Users, Handshake, Clock, FileText, Eraser, Globe, Instagram, Wrench } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import faviconIcon from '@/assets/favicon.png';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSearch?: (query: string) => void;
  onLoadCarousel?: (carouselItem: any) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ activeTab, onTabChange, onSearch, onLoadCarousel }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [displayBalance, setDisplayBalance] = useState<number | null>(null);
  const [monthlyCredits, setMonthlyCredits] = useState<number>(0);
  const [planName, setPlanName] = useState<string>('free');
  const [ferramentasOpen, setFerramentasOpen] = useState(false);
  const [comunidadeOpen, setComunidadeOpen] = useState(false);
  const [parceirosOpen, setParceirosOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevBalanceRef = useRef<number | null>(null);

  // Fetch recent projects + credit balance
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (!cu) return;
      const [{ data: carousels }, { data: credits }, { data: elloSub }] = await Promise.all([
        supabase.from('generated_carousels').select('id, title, topic').eq('company_id', cu.company_id).order('created_at', { ascending: false }).limit(5),
        supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).maybeSingle(),
        supabase.from('ellocontent_subscriptions').select('plan_name, monthly_credits, status').eq('company_id', cu.company_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setRecentProjects(carousels || []);
      const newBalance = credits?.balance ?? 0;
      setCreditBalance(newBalance);
      if (elloSub && (elloSub.status === 'active' || elloSub.status === 'trialing')) {
        setMonthlyCredits(elloSub.monthly_credits || 0);
        setPlanName(elloSub.plan_name || 'free');
      }
    } catch {}
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Re-fetch when window regains focus (e.g. returning from checkout)
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

  // Also re-fetch on route changes (returning from /checkout, /precos, etc.)
  useEffect(() => { fetchData(); }, [location.pathname, fetchData]);

  // Animate credit count when balance changes
  useEffect(() => {
    if (creditBalance === null) return;
    const prev = prevBalanceRef.current;
    if (prev === null || prev === creditBalance) {
      setDisplayBalance(creditBalance);
      prevBalanceRef.current = creditBalance;
      return;
    }
    // Animate from prev to creditBalance
    const start = prev;
    const end = creditBalance;
    const duration = 1200;
    const startTime = performance.now();
    prevBalanceRef.current = creditBalance;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayBalance(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [creditBalance]);

  const email = user?.email || '';
  const username = email.split('@')[0] || 'user';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSearchClick = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    onSearch?.('');
  };

  return (
    <aside className="relative w-[240px] md:w-[240px] h-[calc(100vh-24px)] flex flex-col shrink-0 rounded-2xl m-3 overflow-hidden" style={{ backgroundColor: '#09090d', border: '1px solid rgba(255,255,255,0.04)' }}>
      {/* Purple ambient glow background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[400px] h-[250px] opacity-[0.18]" style={{ background: 'radial-gradient(ellipse at center, #7C3AED 0%, #4C1D95 40%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute top-1/3 -right-10 w-[150px] h-[150px] opacity-[0.06]" style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>
      {/* Scrollable nav area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain relative z-10" style={{ WebkitOverflowScrolling: 'touch' as any }}>
      {/* Logo */}
      <div className="px-4 pt-4 pb-3">
        <img src={faviconIcon} alt="Logo" className="h-8 w-8" />
      </div>

      {/* Nav */}
      <nav className="px-2 space-y-0.5">
        <button
          onClick={() => { onTabChange('home'); closeSearch(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'home' && !searchOpen
              ? 'bg-white/[0.08] text-white'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
        >
          <Home className="w-4 h-4" />
          Home
        </button>

      </nav>

      {/* Projects section */}
      <div className="px-2 mt-5">
        <p className="px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">Projetos</p>
        <button
          onClick={() => { onTabChange('projects'); closeSearch(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            activeTab === 'projects'
              ? 'bg-white/[0.08] text-white font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Conteúdos
        </button>
        <button
          onClick={() => { onTabChange('starred'); closeSearch(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            activeTab === 'starred'
              ? 'bg-white/[0.08] text-white font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
        >
          <Star className="w-4 h-4" />
          Favoritos
        </button>
        <button
          onClick={() => { onTabChange('gallery'); closeSearch(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            activeTab === 'gallery'
              ? 'bg-white/[0.08] text-white font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Galeria
        </button>
        <button
          onClick={() => { onTabChange('prompts'); closeSearch(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            activeTab === 'prompts'
              ? 'bg-white/[0.08] text-white font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
        >
          <MessageSquareText className="w-4 h-4" />
          Prompts
        </button>
        <button
          onClick={() => { onTabChange('marketplace'); closeSearch(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            activeTab === 'marketplace'
              ? 'bg-white/[0.08] text-white font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Estilos
        </button>
      </div>

      {/* Ferramentas section — collapsible */}
      {email === 'admin@gmail.com' && (
        <div className="px-2 mt-5">
          <button
            onClick={() => setFerramentasOpen(!ferramentasOpen)}
            className="w-full flex items-center justify-between px-3 py-1 cursor-pointer group"
          >
            <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Ferramentas</span>
            <ChevronRight className={`w-3 h-3 text-white/20 transition-transform duration-200 ${ferramentasOpen ? 'rotate-90' : ''}`} />
          </button>
          {ferramentasOpen && (
            <div className="mt-1 space-y-0.5">
              {[
                { tab: 'logo-remover', icon: Eraser, label: 'Remover Logo' },
                { tab: 'logo-history', icon: Clock, label: 'Histórico Remoções' },
                { tab: 'behance-import', icon: Globe, label: 'Importar do Behance' },
                { tab: 'instagram-import', icon: Instagram, label: 'Importar do Instagram' },
                { tab: 'face-generator', icon: Camera, label: 'Gerador de Rosto' },
              ].map(({ tab, icon: Icon, label }) => (
                <button
                  key={tab}
                  onClick={() => { onTabChange(tab); closeSearch(); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comunidade section — collapsible */}
      <div className="px-2 mt-5">
        <button
          onClick={() => setComunidadeOpen(!comunidadeOpen)}
          className="w-full flex items-center justify-between px-3 py-1 cursor-pointer group"
        >
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Comunidade</span>
          <ChevronRight className={`w-3 h-3 text-white/20 transition-transform duration-200 ${comunidadeOpen ? 'rotate-90' : ''}`} />
        </button>
        {comunidadeOpen && (
          <div className="mt-1 space-y-0.5">
            <button
              onClick={() => { navigate('/comunidade'); closeSearch(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                location.pathname === '/comunidade'
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <Users className="w-4 h-4" />
              Explorar
            </button>
            <button
              onClick={() => { navigate('/perfil'); closeSearch(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                location.pathname === '/perfil' && !location.pathname.includes('/perfil/')
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <User className="w-4 h-4" />
              Meu Perfil
            </button>
          </div>
        )}
      </div>

      {/* Parceiros section — collapsible */}
      <div className="px-2 mt-5">
        <button
          onClick={() => setParceirosOpen(!parceirosOpen)}
          className="w-full flex items-center justify-between px-3 py-1 cursor-pointer group"
        >
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Parceiros</span>
          <ChevronRight className={`w-3 h-3 text-white/20 transition-transform duration-200 ${parceirosOpen ? 'rotate-90' : ''}`} />
        </button>
        {parceirosOpen && (
          <div className="mt-1 space-y-0.5">
            <button
              onClick={() => { navigate('/area/parceiros'); closeSearch(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                location.pathname === '/area/parceiros'
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <Handshake className="w-4 h-4" />
              Afiliados
            </button>
            {email === 'admin@gmail.com' && (
              <button
                onClick={() => { navigate('/admin'); closeSearch(); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  location.pathname === '/admin'
                    ? 'bg-purple-500/20 text-purple-400 font-medium'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                }`}
              >
                <Shield className="w-4 h-4" />
                Painel Admin
              </button>
            )}
          </div>
        )}
      </div>


      </div>{/* end scrollable nav area */}


      {/* Bottom: Profile — fixed at bottom */}
      <div className="shrink-0 border-t border-white/[0.04] relative z-10">
        {/* Credits with gradient bar and plan marker */}
        {(() => {
          const balance = displayBalance ?? 0;
          const planNameLower = planName.toLowerCase();
          const planLabel = planNameLower.includes('growth') ? 'Growth' : planNameLower.includes('pro') ? 'Pro' : planNameLower.includes('starter') ? 'Starter' : 'Free';
          const planColor = '#8B5CF6';
          // Total bar represents max(balance, monthlyCredits) + some headroom
          const maxBar = Math.max(balance, monthlyCredits, 50);
          const balancePct = Math.min(100, (balance / maxBar) * 100);
          const monthlyMarkerPct = monthlyCredits > 0 ? Math.min(100, (monthlyCredits / maxBar) * 100) : 0;
          const bonusCredits = monthlyCredits > 0 ? Math.max(0, balance - monthlyCredits) : 0;

          return (
            <div className="px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-colors" onClick={() => navigate('/precos')}>
              {/* Plan badge + balance */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: `${planColor}20`, color: planColor }}
                  >
                    {planLabel}
                  </span>
                </div>
                <span className="text-white/70 text-xs font-medium">
                  {Math.floor(balance)} restantes
                </span>
              </div>

              {/* Gradient progress bar with animated shimmer */}
              <div className="relative w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                  style={{
                    width: `${balancePct}%`,
                    background: `linear-gradient(90deg, #7C3AED, #8B5CF6, #A78BFA)`,
                  }}
                >
                  {/* Animated shimmer overlay */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer-credit 2s ease-in-out infinite',
                    }}
                  />
                </div>
                {/* Monthly credits marker line */}
                {monthlyMarkerPct > 0 && monthlyMarkerPct < 100 && (
                  <div
                    className="absolute top-[-3px] bottom-[-3px] w-[2px] rounded-full"
                    style={{
                      left: `${monthlyMarkerPct}%`,
                      backgroundColor: 'rgba(255,255,255,0.5)',
                    }}
                    title={`${monthlyCredits} créditos mensais`}
                  />
                )}
                <style>{`@keyframes shimmer-credit { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
              </div>

              {/* Monthly credits label */}
              {monthlyCredits > 0 && (
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-white/25">
                    {monthlyCredits} mensais
                  </span>
                  {bonusCredits > 0 && (
                    <span className="text-[10px]" style={{ color: `${planColor}99` }}>
                      +{Math.floor(bonusCredits)} bônus
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Profile button */}
        <div className="relative px-2 pb-3">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <p className="text-sm text-white/50 font-medium truncate">{email}</p>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform shrink-0 ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile dropdown */}
          {showProfileMenu && (
            <div
              className="absolute bottom-full left-2 right-2 mb-1 rounded-xl border border-white/[0.06] shadow-2xl overflow-hidden z-50"
              style={{ backgroundColor: '#0d0d12' }}
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm text-white/70 font-medium truncate">{email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/perfil'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4" /> Perfil
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/configuracoes'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" /> Configurações
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/precos'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" /> Plano & Créditos
                </button>
              </div>
              <div className="border-t border-white/[0.06] py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400/60 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Powered by ellosuit */}
        <div className="px-4 pb-3 pt-1 flex justify-center">
          <a
            href="https://www.ellosuit.online"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-white/20 hover:text-white/40 transition-colors"
          >
            Powered by <span className="font-semibold">ellosuit</span>
          </a>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
