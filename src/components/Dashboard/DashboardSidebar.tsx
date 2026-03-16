import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, FolderOpen, Star, Settings, LogOut, ChevronDown, ChevronRight, User, CreditCard, X, ImageIcon, ShoppingBag, MessageSquareText, Camera, Brush, Shield, Users, Handshake, Clock, FileText, Eraser, Globe, Instagram, Wrench } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import ellocontentIcon from '@/assets/ellocontent_icon.png';

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
    <aside className="w-[240px] md:w-[240px] h-[calc(100vh-24px)] flex flex-col shrink-0 rounded-2xl m-3 overflow-hidden" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Scrollable nav area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as any }}>
      {/* Logo */}
      <div className="px-4 pt-4 pb-3">
        <img src={ellocontentIcon} alt="elloContent" className="h-8" />
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

      {/* Ferramentas section */}
      {email === 'admin@gmail.com' && (
        <div className="px-2 mt-5">
          <p className="px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">Ferramentas</p>
          <button
            onClick={() => { onTabChange('logo-remover'); closeSearch(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              activeTab === 'logo-remover'
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <Eraser className="w-4 h-4" />
            Remover Logo
          </button>
          <button
            onClick={() => { onTabChange('logo-history'); closeSearch(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              activeTab === 'logo-history'
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <Clock className="w-4 h-4" />
            Histórico Remoções
          </button>
          <button
            onClick={() => { onTabChange('behance-import'); closeSearch(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              activeTab === 'behance-import'
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <Globe className="w-4 h-4" />
            Importar do Behance
          </button>
          <button
            onClick={() => { onTabChange('instagram-import'); closeSearch(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              activeTab === 'instagram-import'
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <Instagram className="w-4 h-4" />
            Importar do Instagram
          </button>
          <button
            onClick={() => { onTabChange('face-generator'); closeSearch(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              activeTab === 'face-generator'
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <Camera className="w-4 h-4" />
            Gerador de Rosto
          </button>
        </div>
      )}

      {/* Comunidade section */}
      <div className="px-2 mt-5">
        <p className="px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">Comunidade</p>
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

      {/* Parceiros section */}
      <div className="px-2 mt-5">
        <p className="px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">Parceiros</p>
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
        {/* Admin Panel - only for admin@gmail.com */}
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


      </div>{/* end scrollable nav area */}


      {/* Bottom: Profile — fixed at bottom */}
      <div className="shrink-0 border-t border-white/[0.06]">
        {/* Credits */}
        <div className="px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-colors rounded-lg" onClick={() => navigate('/precos')}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Créditos</span>
            <span className="text-white/70 font-medium">{displayBalance !== null ? `${Math.floor(displayBalance)} restantes` : '...'}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.06] mt-1.5">
            <div className="h-full rounded-full bg-purple-500/60 transition-all duration-700" style={{ width: `${Math.min(100, ((displayBalance ?? 0) / 100) * 100)}%` }} />
          </div>
        </div>

        {/* Profile button */}
        <div className="relative px-2 pb-3">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm text-white/80 font-medium truncate">{username}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
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
      </div>
    </aside>
  );
};

export default DashboardSidebar;
