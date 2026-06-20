import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Star, Settings, LogOut, ChevronDown, User, CreditCard,
  LayoutGrid, Sparkles, PenTool, Palette, Users, Handshake, Shield,
  HelpCircle, PanelLeftClose, PanelLeftOpen, TrendingUp, MessageCircle,
  Wrench, Calendar, Zap, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import faviconIcon from '@/assets/favicon.png';
import TrialStatusBadge from './TrialStatusBadge';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSearch?: (query: string) => void;
  onLoadCarousel?: (carouselItem: any) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ activeTab, onTabChange, collapsed = false, onToggleCollapse }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [displayBalance, setDisplayBalance] = useState<number | null>(null);
  const [monthlyCredits, setMonthlyCredits] = useState<number>(0);
  const [planName, setPlanName] = useState<string>('free');
  const [isAffiliate, setIsAffiliate] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (!cu) return;
      const [{ data: credits }, { data: elloSub }, { data: affiliateData }] = await Promise.all([
        supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).maybeSingle(),
        supabase.from('ellocontent_subscriptions').select('plan_name, monthly_credits, status').eq('company_id', cu.company_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('affiliate_partners').select('id').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      ]);
      setCreditBalance(credits?.balance ?? 0);
      setIsAffiliate(!!affiliateData);
      if (elloSub && (elloSub.status === 'active' || elloSub.status === 'trialing')) {
        setMonthlyCredits(elloSub.monthly_credits || 0);
        setPlanName(elloSub.plan_name || 'free');
      }
    } catch {}
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);
  useEffect(() => { fetchData(); }, [location.pathname, fetchData]);

  useEffect(() => {
    if (creditBalance === null) return;
    const prev = prevBalanceRef.current;
    if (prev === null || prev === creditBalance) {
      setDisplayBalance(creditBalance);
      prevBalanceRef.current = creditBalance;
      return;
    }
    const start = prev, end = creditBalance, duration = 1200;
    const startTime = performance.now();
    prevBalanceRef.current = creditBalance;
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayBalance(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [creditBalance]);

  const email = user?.email || '';
  const isAdmin = email === 'admin@gmail.com';
  const handleSignOut = async () => { await signOut(); navigate('/'); };

  // Nav item helper
  const NavItem = ({ active, onClick, icon: Icon, label, accent }: { active: boolean; onClick: () => void; icon: any; label: string; accent?: boolean }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
        active ? 'text-white bg-white/[0.04]' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
      }`}
      title={collapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" style={accent && active ? { color: '#a78bfa' } : undefined} />
      {!collapsed && label}
    </button>
  );

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    !collapsed ? <p className="px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5 mt-5">{children}</p> : <div className="mt-4 mx-3 border-t border-white/[0.04]" />
  );

  return (
    <aside className={`relative ${collapsed ? 'w-[60px]' : 'w-[240px]'} h-screen flex flex-col shrink-0 overflow-hidden transition-all duration-300 border-r`} style={{ backgroundColor: '#09090d', borderColor: 'rgba(255,255,255,0.04)' }}>
      {/* Purple ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[400px] h-[250px] opacity-[0.18]" style={{ background: 'radial-gradient(ellipse at center, #7C3AED 0%, #4C1D95 40%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain relative z-10" style={{ WebkitOverflowScrolling: 'touch' as any }}>
        {/* Logo + collapse */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} pt-4 pb-3`}>
          <img src={faviconIcon} alt="Logo" className="h-8 w-8 shrink-0" />
          {!collapsed && onToggleCollapse && (
            <button onClick={onToggleCollapse} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/50 transition-colors cursor-pointer" title="Recolher">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* CRIAR */}
        <div className={`${collapsed ? 'px-1.5' : 'px-2'} space-y-0.5`}>
          <SectionLabel>Criar</SectionLabel>
          <NavItem active={activeTab === 'home'} onClick={() => onTabChange('home')} icon={Home} label="Início" />
          <NavItem active={location.pathname === '/criar'} onClick={() => navigate('/criar')} icon={MessageCircle} label="Chat IA" accent />
        </div>

        {/* BIBLIOTECA */}
        <div className={`${collapsed ? 'px-1.5' : 'px-2'} space-y-0.5`}>
          <SectionLabel>Biblioteca</SectionLabel>
          <div className="flex items-center">
            <button
              onClick={() => onTabChange('projects')}
              className={`flex-1 flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                activeTab === 'projects' || activeTab === 'starred' ? 'text-white bg-white/[0.04]' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
              title={collapsed ? 'Meus posts' : undefined}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              {!collapsed && 'Meus posts'}
            </button>
            {!collapsed && (activeTab === 'projects' || activeTab === 'starred') && (
              <button
                onClick={() => onTabChange(activeTab === 'starred' ? 'projects' : 'starred')}
                className="p-1.5 rounded-md cursor-pointer transition-colors mr-1"
                title={activeTab === 'starred' ? 'Mostrando favoritos' : 'Ver favoritos'}
              >
                <Star className="w-3.5 h-3.5" style={{ color: activeTab === 'starred' ? '#a78bfa' : 'rgba(255,255,255,0.25)' }} fill={activeTab === 'starred' ? '#a78bfa' : 'none'} />
              </button>
            )}
          </div>
          <NavItem active={activeTab === 'gallery'} onClick={() => onTabChange('gallery')} icon={Sparkles} label="Galeria de marca" />
          <NavItem active={activeTab === 'prompts'} onClick={() => onTabChange('prompts')} icon={PenTool} label="Meus prompts" />
        </div>

        {/* PLANEJAR */}
        <div className={`${collapsed ? 'px-1.5' : 'px-2'} space-y-0.5`}>
          <SectionLabel>Planejar</SectionLabel>
          <NavItem active={location.pathname === '/calendario'} onClick={() => navigate('/calendario')} icon={Calendar} label="Calendário" />
          <NavItem active={location.pathname === '/hooks'} onClick={() => navigate('/hooks')} icon={Zap} label="Hooks" />
          <NavItem active={location.pathname === '/insights'} onClick={() => navigate('/insights')} icon={BarChart3} label="Insights" />
        </div>

        {/* DESCOBRIR */}
        <div className={`${collapsed ? 'px-1.5' : 'px-2'} space-y-0.5`}>
          <SectionLabel>Descobrir</SectionLabel>
          <NavItem active={activeTab === 'marketplace'} onClick={() => onTabChange('marketplace')} icon={Palette} label="Estilos" />
          <NavItem active={location.pathname === '/comunidade'} onClick={() => navigate('/comunidade')} icon={Users} label="Comunidade" />
          {isAdmin && (
            <NavItem active={activeTab === 'trends'} onClick={() => onTabChange('trends')} icon={TrendingUp} label="Tendências" accent />
          )}
        </div>

        {/* FERRAMENTAS (admin) */}
        {isAdmin && (
          <div className={`${collapsed ? 'px-1.5' : 'px-2'} space-y-0.5`}>
            <SectionLabel>Ferramentas</SectionLabel>
            <NavItem active={activeTab === 'logo-remover' || activeTab === 'logo-history' || activeTab === 'behance-import' || activeTab === 'instagram-import' || activeTab === 'face-generator'} onClick={() => onTabChange('logo-remover')} icon={Wrench} label="Ferramentas" />
          </div>
        )}

        {/* PARCEIROS (apenas afiliado/admin) */}
        {(isAffiliate || isAdmin) && (
          <div className={`${collapsed ? 'px-1.5' : 'px-2'} space-y-0.5`}>
            <SectionLabel>Parceiros</SectionLabel>
            {isAffiliate && (
              <NavItem active={location.pathname === '/area/parceiros'} onClick={() => navigate('/area/parceiros')} icon={Handshake} label="Afiliados" />
            )}
            {isAdmin && (
              <NavItem active={location.pathname === '/admin'} onClick={() => navigate('/admin')} icon={Shield} label="Admin" />
            )}
          </div>
        )}

        {/* AJUDA */}
        <div className={`${collapsed ? 'px-1.5' : 'px-2'} space-y-0.5 mb-4`}>
          <SectionLabel>Ajuda</SectionLabel>
          <NavItem active={location.pathname === '/ajuda'} onClick={() => navigate('/ajuda')} icon={HelpCircle} label="Central de ajuda" />
        </div>
      </div>

      {/* Bottom: Profile */}
      <div className="shrink-0 border-t border-white/[0.04] relative z-10">
        {collapsed ? (
          <div className="flex flex-col items-center py-3 gap-2">
            {onToggleCollapse && (
              <button onClick={onToggleCollapse} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/50 transition-colors cursor-pointer" title="Expandir">
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/60 transition-colors cursor-pointer" title={email}>
              <User className="w-4 h-4" />
            </button>
            {showProfileMenu && (
              <div className="absolute bottom-full left-1 mb-1 w-56 rounded-xl border border-white/[0.06] shadow-2xl overflow-hidden z-50" style={{ backgroundColor: '#0d0d12' }}>
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-sm text-white/70 font-medium truncate">{email}</p>
                </div>
                <div className="py-1">
                  <button onClick={() => { setShowProfileMenu(false); navigate('/perfil'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"><User className="w-4 h-4" /> Perfil</button>
                  <button onClick={() => { setShowProfileMenu(false); navigate('/configuracoes'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"><Settings className="w-4 h-4" /> Configurações</button>
                  <button onClick={() => { setShowProfileMenu(false); navigate('/precos'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"><CreditCard className="w-4 h-4" /> Plano & Créditos</button>
                </div>
                <div className="border-t border-white/[0.06] py-1">
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400/60 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"><LogOut className="w-4 h-4" /> Sair</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {(() => {
              const balance = displayBalance ?? 0;
              const planNameLower = planName.toLowerCase();
              const planLabel = planNameLower.includes('growth') ? 'Growth' : planNameLower.includes('pro') ? 'Pro' : planNameLower.includes('starter') ? 'Starter' : 'Free';
              const planColor = '#8B5CF6';
              const maxBar = Math.max(balance, monthlyCredits, 50);
              const balancePct = Math.min(100, (balance / maxBar) * 100);
              const monthlyMarkerPct = monthlyCredits > 0 ? Math.min(100, (monthlyCredits / maxBar) * 100) : 0;
              const bonusCredits = monthlyCredits > 0 ? Math.max(0, balance - monthlyCredits) : 0;
              return (
                <div className="px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-colors" onClick={() => navigate('/precos')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${planColor}20`, color: planColor }}>{planLabel}</span>
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
                      {bonusCredits > 0 && <span className="text-[10px]" style={{ color: `${planColor}99` }}>+{Math.floor(bonusCredits)} bônus</span>}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="relative px-2 pb-3">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer">
                <p className="text-sm text-white/50 font-medium truncate">{email}</p>
                <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform shrink-0 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showProfileMenu && (
                <div className="absolute bottom-full left-2 right-2 mb-1 rounded-xl border border-white/[0.06] shadow-2xl overflow-hidden z-50" style={{ backgroundColor: '#0d0d12' }}>
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-sm text-white/70 font-medium truncate">{email}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setShowProfileMenu(false); navigate('/perfil'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"><User className="w-4 h-4" /> Perfil</button>
                    <button onClick={() => { setShowProfileMenu(false); navigate('/configuracoes'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"><Settings className="w-4 h-4" /> Configurações</button>
                    <button onClick={() => { setShowProfileMenu(false); navigate('/precos'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"><CreditCard className="w-4 h-4" /> Plano & Créditos</button>
                  </div>
                  <div className="border-t border-white/[0.06] py-1">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400/60 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"><LogOut className="w-4 h-4" /> Sair</button>
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 pb-3 pt-1 flex justify-center">
              <a href="https://www.ellosuit.online" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/20 hover:text-white/40 transition-colors">
                Powered by <span className="font-semibold">ellosuit</span>
              </a>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;
