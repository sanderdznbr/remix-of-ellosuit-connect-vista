import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Settings, LogOut, ChevronDown, User, CreditCard,
  PanelLeftClose, PanelLeftOpen, Star,
  Compass, MessagesSquare, FolderDot, Aperture, FeatherIcon,
  CalendarRange, Flame, LineChart, Shapes, UsersRound,
  Radar, Wand2, Handshake, ShieldCheck, LifeBuoy,
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

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ activeTab, onTabChange, collapsed: collapsedProp = false, onToggleCollapse }) => {
  const [hovered, setHovered] = useState(false);
  const collapsed = collapsedProp && !hovered;
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

  // Elegant nav item with refined icon
  const NavItem = ({
    active,
    onClick,
    label,
    icon: Icon,
    trailing,
  }: {
    active: boolean;
    onClick: () => void;
    label: string;
    icon: any;
    trailing?: React.ReactNode;
  }) => {
    if (collapsed) {
      return (
        <button
          onClick={onClick}
          className="relative w-full flex items-center justify-center py-2.5 group cursor-pointer"
          title={label}
        >
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all ${
              active ? 'h-5 bg-[#a78bfa]' : 'h-0 bg-transparent'
            }`}
          />
          <Icon
            className="w-[18px] h-[18px] transition-colors"
            strokeWidth={1.6}
            style={{ color: active ? '#e9e5ff' : 'rgba(255,255,255,0.4)' }}
          />
        </button>
      );
    }
    return (
      <button
        onClick={onClick}
        className={`relative w-full flex items-center gap-3 pl-5 pr-3 py-2.5 text-[14px] tracking-tight transition-all cursor-pointer group ${
          active ? 'text-white' : 'text-white/50 hover:text-white/90'
        }`}
      >
        <span
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all ${
            active ? 'h-5 bg-[#a78bfa]' : 'h-0 bg-transparent group-hover:h-3.5 group-hover:bg-white/20'
          }`}
        />
        <Icon
          className="w-[17px] h-[17px] shrink-0 transition-colors"
          strokeWidth={1.6}
          style={active ? { color: '#c4b5fd' } : undefined}
        />
        <span className="flex-1 text-left font-normal">{label}</span>
        {trailing}
      </button>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    !collapsed ? (
      <p className="px-5 text-[10px] font-medium text-white/25 uppercase tracking-[0.16em] mb-1.5 mt-6">{children}</p>
    ) : (
      <div className="mt-5 mx-3 border-t border-white/[0.04]" />
    )
  );

  return (
    <>
      {/* Backdrop blur when hover-expanded */}
      {collapsedProp && (
        <div
          className={`fixed inset-0 z-30 pointer-events-none transition-all duration-300 ${hovered ? 'opacity-100 backdrop-blur-md bg-black/30' : 'opacity-0 backdrop-blur-0 bg-black/0'}`}
          aria-hidden="true"
        />
      )}
    <aside
      onMouseEnter={() => collapsedProp && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative ${collapsedProp ? 'w-[64px]' : 'w-[264px]'} h-screen shrink-0 transition-all duration-300`}
      aria-label="Navegação principal"
      aria-expanded={!collapsed}
      data-state={collapsed ? 'collapsed' : 'expanded'}
    >
      <div
        className={`${collapsed ? 'w-[64px]' : 'w-[264px]'} h-screen flex flex-col overflow-hidden transition-all duration-300 border-r absolute top-0 left-0 z-40 ${collapsedProp && hovered ? 'shadow-2xl shadow-black/50' : ''}`}
        style={{
          background: 'linear-gradient(180deg, #050507 0%, #07070b 100%)',
          borderColor: 'rgba(255,255,255,0.03)',
        }}
      >
      {/* Very subtle top vignette */}
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse at top, rgba(139,92,246,0.05) 0%, transparent 70%)' }} />

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain relative z-10 sidebar-scroll" style={{ WebkitOverflowScrolling: 'touch' as any }}>
        {/* Logo + collapse */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'} pt-5 pb-4`}>
          <img src={faviconIcon} alt="Logo" className="h-8 w-8 shrink-0 opacity-95" />
          {!collapsed && onToggleCollapse && (
            <button onClick={onToggleCollapse} className="p-1.5 rounded-md hover:bg-white/[0.04] text-white/25 hover:text-white/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20" title="Recolher" aria-label="Recolher sidebar" aria-expanded={true} aria-controls="dashboard-sidebar-nav">
              <PanelLeftClose className="w-[15px] h-[15px]" />
            </button>
          )}
        </div>

        {/* CRIAR */}
        <div className="space-y-px">
          <SectionLabel>Criar</SectionLabel>
          <NavItem active={activeTab === 'home'} onClick={() => onTabChange('home')} label="Início" icon={Compass} />
          <NavItem
            active={location.pathname === '/criar'}
            onClick={() => navigate('/criar')}
            label="Chat IA"
            icon={MessagesSquare}
          />
        </div>

        {/* BIBLIOTECA */}
        <div className="space-y-px">
          <SectionLabel>Biblioteca</SectionLabel>
          <NavItem
            active={activeTab === 'projects' || activeTab === 'starred'}
            onClick={() => onTabChange('projects')}
            label="Meus posts"
            icon={FolderDot}
            trailing={
              !collapsed && (activeTab === 'projects' || activeTab === 'starred') ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onTabChange(activeTab === 'starred' ? 'projects' : 'starred'); }}
                  className="p-0.5 rounded transition-colors cursor-pointer"
                  title={activeTab === 'starred' ? 'Mostrando favoritos' : 'Ver favoritos'}
                >
                  <Star className="w-3.5 h-3.5" style={{ color: activeTab === 'starred' ? '#a78bfa' : 'rgba(255,255,255,0.3)' }} fill={activeTab === 'starred' ? '#a78bfa' : 'none'} />
                </button>
              ) : undefined
            }
          />
          <NavItem active={activeTab === 'gallery'} onClick={() => onTabChange('gallery')} label="Galeria de marca" icon={Aperture} />
          <NavItem active={activeTab === 'prompts'} onClick={() => onTabChange('prompts')} label="Meus prompts" icon={FeatherIcon} />
        </div>

        {/* PLANEJAR */}
        <div className="space-y-px">
          <SectionLabel>Planejar</SectionLabel>
          <NavItem active={location.pathname === '/calendario'} onClick={() => navigate('/calendario')} label="Calendário" icon={CalendarRange} />
          <NavItem active={location.pathname === '/hooks'} onClick={() => navigate('/hooks')} label="Hooks" icon={Flame} />
          <NavItem active={location.pathname === '/insights'} onClick={() => navigate('/insights')} label="Insights" icon={LineChart} />
        </div>

        {/* DESCOBRIR */}
        <div className="space-y-px">
          <SectionLabel>Descobrir</SectionLabel>
          <NavItem active={activeTab === 'marketplace'} onClick={() => onTabChange('marketplace')} label="Estilos" icon={Shapes} />
          <NavItem active={location.pathname === '/comunidade'} onClick={() => navigate('/comunidade')} label="Comunidade" icon={UsersRound} />
          {isAdmin && (
            <NavItem active={activeTab === 'trends'} onClick={() => onTabChange('trends')} label="Tendências" icon={Radar} />
          )}
        </div>

        {/* FERRAMENTAS (admin) */}
        {isAdmin && (
          <div className="space-y-px">
            <SectionLabel>Ferramentas</SectionLabel>
            <NavItem
              active={['logo-remover','logo-history','behance-import','instagram-import','face-generator'].includes(activeTab)}
              onClick={() => onTabChange('logo-remover')}
              label="Ferramentas"
              icon={Wand2}
            />
          </div>
        )}

        {/* PARCEIROS (apenas afiliado/admin) */}
        {(isAffiliate || isAdmin) && (
          <div className="space-y-px">
            <SectionLabel>Parceiros</SectionLabel>
            {isAffiliate && (
              <NavItem active={location.pathname === '/area/parceiros'} onClick={() => navigate('/area/parceiros')} label="Afiliados" icon={Handshake} />
            )}
            {isAdmin && (
              <NavItem active={location.pathname === '/admin'} onClick={() => navigate('/admin')} label="Admin" icon={ShieldCheck} />
            )}
          </div>
        )}

        {/* AJUDA */}
        <div className="space-y-px mb-5">
          <SectionLabel>Ajuda</SectionLabel>
          <NavItem active={location.pathname === '/ajuda'} onClick={() => navigate('/ajuda')} label="Central de ajuda" icon={LifeBuoy} />
        </div>
      </div>

      {/* Bottom: Profile */}
      <div className="shrink-0 border-t border-white/[0.03] relative z-10" style={{ background: 'rgba(0,0,0,0.25)' }}>
        {collapsed ? (
          <div className="flex flex-col items-center py-3 gap-2">
            <TrialStatusBadge collapsed />
            {onToggleCollapse && (
              <button onClick={onToggleCollapse} className="p-2 rounded-md hover:bg-white/[0.05] text-white/25 hover:text-white/60 transition-colors cursor-pointer" title="Expandir">
                <PanelLeftOpen className="w-[15px] h-[15px]" />
              </button>
            )}
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="p-2 rounded-md hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors cursor-pointer" title={email}>
              <User className="w-[15px] h-[15px]" />
            </button>
            {showProfileMenu && (
              <div className="absolute bottom-full left-1 mb-1 w-56 rounded-xl border border-white/[0.06] shadow-2xl overflow-hidden z-50" style={{ backgroundColor: '#0a0a0e' }}>
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
            <div className="pt-2 pb-1"><TrialStatusBadge /></div>
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
                <div className="px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => navigate('/precos')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${planColor}18`, color: planColor }}>{planLabel}</span>
                    <span className="text-white/60 text-[11px] font-medium tabular-nums">{Math.floor(balance)} restantes</span>
                  </div>
                  <div className="relative w-full h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden" style={{ width: `${balancePct}%`, background: `linear-gradient(90deg, #6D28D9, #8B5CF6, #A78BFA)` }}>
                      <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer-credit 2s ease-in-out infinite' }} />
                    </div>
                    {monthlyMarkerPct > 0 && monthlyMarkerPct < 100 && (
                      <div className="absolute top-[-2px] bottom-[-2px] w-[1.5px] rounded-full" style={{ left: `${monthlyMarkerPct}%`, backgroundColor: 'rgba(255,255,255,0.4)' }} />
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

            <div className="relative px-2 pb-2">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.03] transition-colors cursor-pointer">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold text-white/80" style={{ background: 'linear-gradient(135deg, #7C3AED, #4C1D95)' }}>
                    {email.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-[12px] text-white/60 font-normal truncate">{email}</p>
                </div>
                <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showProfileMenu && (
                <div className="absolute bottom-full left-2 right-2 mb-1 rounded-xl border border-white/[0.06] shadow-2xl overflow-hidden z-50" style={{ backgroundColor: '#0a0a0e' }}>
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
            <div className="px-4 pb-3 flex justify-center">
              <a href="https://www.ellosuit.online" target="_blank" rel="noopener noreferrer" className="text-[9px] text-white/15 hover:text-white/35 transition-colors tracking-wide">
                Powered by <span className="font-semibold">ellosuit</span>
              </a>
            </div>
          </>
        )}
      </div>
      </div>
    </aside>
    </>
  );
};

export default DashboardSidebar;
